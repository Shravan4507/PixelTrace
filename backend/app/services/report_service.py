import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from backend.app.config import settings
from backend.app.core.database import get_db
from backend.app.core.logging import logger
from backend.app.services.audit_service import AuditService
from backend.app.services.case_service import CaseService
from backend.app.services.evidence_service import EvidenceService
from backend.app.services.metadata_service import MetadataService
from backend.app.services.ela_service import ELAService
from backend.app.services.hashing_service import HashingService

# Register D-DIN fonts with ReportLab
FONT_NAME_REGULAR = "Helvetica"
FONT_NAME_BOLD = "Helvetica-Bold"
FONT_NAME_ITALIC = "Helvetica-Oblique"

try:
    regular_font_path = settings.FONTS_DIR / "D-DIN.ttf"
    bold_font_path = settings.FONTS_DIR / "D-DIN-Bold.ttf"
    italic_font_path = settings.FONTS_DIR / "D-DIN-Italic.ttf"
    
    if regular_font_path.exists():
        pdfmetrics.registerFont(TTFont("D-DIN", str(regular_font_path)))
        FONT_NAME_REGULAR = "D-DIN"
    if bold_font_path.exists():
        pdfmetrics.registerFont(TTFont("D-DIN-Bold", str(bold_font_path)))
        FONT_NAME_BOLD = "D-DIN-Bold"
    if italic_font_path.exists():
        pdfmetrics.registerFont(TTFont("D-DIN-Italic", str(italic_font_path)))
        FONT_NAME_ITALIC = "D-DIN-Italic"
    logger.info("Successfully registered D-DIN font family for ReportLab PDF generation.")
except Exception as e:
    logger.warning(f"Could not register custom D-DIN font in ReportLab; falling back to Helvetica: {e}")


class NumberedCanvas(canvas.Canvas):
    """Canvas that injects running page numbers (Page X of Y) and forensic footer."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count: int):
        self.saveState()
        self.setFont(FONT_NAME_REGULAR, 8)
        self.setFillColor(colors.HexColor("#666666"))
        
        # Footer text
        footer_left = "PIXELTRACE DIGITAL FORENSICS // CONFIDENTIAL EVIDENCE REPORT"
        footer_right = f"PAGE {self._pageNumber} OF {page_count}"
        
        self.drawString(54, 36, footer_left)
        self.drawRightString(letter[0] - 54, 36, footer_right)
        
        # Subtle horizontal dividing rule
        self.setStrokeColor(colors.HexColor("#333333"))
        self.setLineWidth(0.5)
        self.line(54, 48, letter[0] - 54, 48)
        self.restoreState()


class ReportService:
    @classmethod
    def generate_report(
        cls,
        case_id: str,
        evidence_id: Optional[str] = None,
        report_format: str = "PDF",
        title: Optional[str] = None,
        examiner_name: Optional[str] = None,
        include_ela: bool = True,
        include_metadata: bool = True,
        include_chain_of_custody: bool = True
    ) -> dict[str, Any]:
        case = CaseService.get_case(case_id)
        if not case:
            raise FileNotFoundError(f"Case '{case_id}' not found.")

        examiner = examiner_name or case["examiner_name"] or "Investigative Examiner"
        report_title = title or f"Forensic Investigation Report - {case['reference_number']}"
        report_id = str(uuid.uuid4())
        now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat()
        now_human = now_dt.strftime("%Y-%m-%d %H:%M:%S UTC")

        # Collect evidence list
        evidence_items = []
        if evidence_id:
            ev = EvidenceService.get_evidence(evidence_id)
            if ev:
                evidence_items.append(ev)
        else:
            evidence_items = EvidenceService.list_evidence(case_id=case_id)

        # Audit events for chain of custody
        audit_events = AuditService.get_events(case_id=case_id, evidence_id=evidence_id, limit=50)

        # Case reports directory
        case_reports_dir = settings.CASES_DIR / case_id / "reports"
        case_reports_dir.mkdir(parents=True, exist_ok=True)

        if report_format.upper() == "JSON":
            # Generate JSON Report
            filename = f"report_{report_id}.json"
            report_file_path = case_reports_dir / filename

            report_data = {
                "report_id": report_id,
                "title": report_title,
                "generated_at": now_iso,
                "examiner": examiner,
                "case": case,
                "evidence_count": len(evidence_items),
                "evidence": [],
                "chain_of_custody": audit_events,
                "methodological_limitations": (
                    "PixelTrace generates empirical observations based on cryptographic hashes, EXIF metadata tags, "
                    "and Error Level Analysis (ELA). Cryptographic matches establish byte identity but not provenance. "
                    "ELA visualizes recompression differentials and does not constitute absolute proof of manipulation. "
                    "Metadata can be forged or stripped. Human expert testimony is required for legal proceedings."
                )
            }

            for ev in evidence_items:
                ev_data: dict[str, Any] = {
                    "evidence_id": ev["id"],
                    "original_filename": ev["original_filename"],
                    "format": ev["file_format"],
                    "size_bytes": ev["file_size"],
                    "dimensions": f"{ev['width']}x{ev['height']}",
                    "sha256": ev["sha256"],
                    "md5": ev["md5"],
                    "ingestion_timestamp": ev["upload_timestamp"],
                }
                if include_metadata:
                    try:
                        ev_data["metadata"] = MetadataService.extract_metadata(Path(ev["file_path"]))
                    except Exception as e:
                        ev_data["metadata_error"] = str(e)
                if include_ela:
                    try:
                        ela_dir = settings.CASES_DIR / case_id / "derived" / "ela"
                        ev_data["ela"] = ELAService.perform_ela(Path(ev["file_path"]), output_dir=ela_dir)
                    except Exception as e:
                        ev_data["ela_error"] = str(e)
                report_data["evidence"].append(ev_data)

            with open(report_file_path, "w", encoding="utf-8") as f:
                json.dump(report_data, f, indent=2, ensure_ascii=False)

            file_size = report_file_path.stat().st_size

        else:
            # Generate PDF Report
            filename = f"report_{report_id}.pdf"
            report_file_path = case_reports_dir / filename
            cls._build_pdf_report(
                output_path=report_file_path,
                report_id=report_id,
                report_title=report_title,
                case=case,
                examiner=examiner,
                generated_at=now_human,
                evidence_items=evidence_items,
                audit_events=audit_events,
                include_ela=include_ela,
                include_metadata=include_metadata,
                include_chain_of_custody=include_chain_of_custody
            )
            file_size = report_file_path.stat().st_size

        # Save record in reports table
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO reports (id, case_id, evidence_id, report_format, file_path, file_size, title, examiner_name, generated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                report_id, case_id, evidence_id, report_format.upper(),
                str(report_file_path), file_size, report_title, examiner, now_iso
            ))

        AuditService.log_event(
            event_type="REPORT_GENERATED",
            case_id=case_id,
            evidence_id=evidence_id,
            examiner_name=examiner,
            details={
                "report_id": report_id,
                "format": report_format.upper(),
                "file_size": file_size,
                "title": report_title
            }
        )

        return {
            "id": report_id,
            "case_id": case_id,
            "evidence_id": evidence_id,
            "report_format": report_format.upper(),
            "title": report_title,
            "file_size": file_size,
            "examiner_name": examiner,
            "generated_at": now_iso,
            "download_url": f"/api/v1/reports/{report_id}/download"
        }

    @classmethod
    def _build_pdf_report(
        cls,
        output_path: Path,
        report_id: str,
        report_title: str,
        case: dict[str, Any],
        examiner: str,
        generated_at: str,
        evidence_items: list[dict[str, Any]],
        audit_events: list[dict[str, Any]],
        include_ela: bool,
        include_metadata: bool,
        include_chain_of_custody: bool
    ) -> None:
        doc = SimpleDocTemplate(
            str(output_path),
            pagesize=letter,
            leftMargin=54,
            rightMargin=54,
            topMargin=54,
            bottomMargin=54
        )

        styles = getSampleStyleSheet()
        
        # Monochromatic Report Styles
        title_style = ParagraphStyle(
            "PT_Title",
            parent=styles["Normal"],
            fontName=FONT_NAME_BOLD,
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#000000"),
            spaceAfter=4
        )
        subtitle_style = ParagraphStyle(
            "PT_Subtitle",
            parent=styles["Normal"],
            fontName=FONT_NAME_REGULAR,
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#444444"),
            spaceAfter=15
        )
        h2_style = ParagraphStyle(
            "PT_H2",
            parent=styles["Normal"],
            fontName=FONT_NAME_BOLD,
            fontSize=12,
            leading=15,
            textColor=colors.HexColor("#000000"),
            spaceBefore=14,
            spaceAfter=6,
            keepWithNext=True
        )
        body_style = ParagraphStyle(
            "PT_Body",
            parent=styles["Normal"],
            fontName=FONT_NAME_REGULAR,
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#222222")
        )
        code_style = ParagraphStyle(
            "PT_Code",
            parent=styles["Normal"],
            fontName=FONT_NAME_REGULAR,
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#111111")
        )
        disclaimer_style = ParagraphStyle(
            "PT_Disclaimer",
            parent=styles["Normal"],
            fontName=FONT_NAME_ITALIC,
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#555555")
        )

        story = []

        # 1. Header Banner
        header_data = [
            [
                Paragraph("<b>PIXELTRACE</b> // DIGITAL FORENSICS", ParagraphStyle("HdrL", fontName=FONT_NAME_BOLD, fontSize=11, textColor=colors.HexColor("#000000"))),
                Paragraph("OFFLINE EVIDENCE ANALYSIS", ParagraphStyle("HdrR", fontName=FONT_NAME_REGULAR, fontSize=9, alignment=2, textColor=colors.HexColor("#555555")))
            ]
        ]
        header_table = Table(header_data, colWidths=[300, 204])
        header_table.setStyle(TableStyle([
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LINEBELOW', (0, 0), (-1, -1), 1, colors.HexColor("#000000"))
        ]))
        story.append(header_table)
        story.append(Spacer(1, 14))

        # Title
        story.append(Paragraph(report_title.upper(), title_style))
        story.append(Paragraph(f"REPORT ID: {report_id} &nbsp;|&nbsp; GENERATED: {generated_at}", subtitle_style))

        # 2. Case Dossier Summary Table
        story.append(Paragraph("1. INVESTIGATION CASE SUMMARY", h2_style))
        case_info = [
            [Paragraph("<b>Case Reference:</b>", body_style), Paragraph(case["reference_number"], body_style),
             Paragraph("<b>Examiner:</b>", body_style), Paragraph(examiner, body_style)],
            [Paragraph("<b>Case Title:</b>", body_style), Paragraph(case["title"], body_style),
             Paragraph("<b>Case Status:</b>", body_style), Paragraph(case["status"], body_style)],
            [Paragraph("<b>Date Opened:</b>", body_style), Paragraph(case["created_at"][:19], body_style),
             Paragraph("<b>Items Evaluated:</b>", body_style), Paragraph(str(len(evidence_items)), body_style)],
        ]
        case_table = Table(case_info, colWidths=[90, 162, 90, 162])
        case_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8F8F8")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#DDDDDD")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EEEEEE")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(case_table)
        story.append(Spacer(1, 12))

        # 3. Evidence Items Detail & Hash Analysis
        story.append(Paragraph("2. EVIDENCE ITEMS & CRYPTOGRAPHIC VERIFICATION", h2_style))
        if not evidence_items:
            story.append(Paragraph("No evidence items currently attached to this investigation case.", disclaimer_style))
        else:
            for idx, ev in enumerate(evidence_items, 1):
                ev_path = Path(ev["file_path"])
                
                # Ingestion Integrity Check
                is_intact, current_sha = HashingService.verify_integrity(ev_path, ev["sha256"])
                integrity_text = "PASSED: EXACT BINARY MATCH TO INGESTION HASH" if is_intact else "ALERT: INTEGRITY MISMATCH"

                ev_summary = [
                    [Paragraph(f"<b>Item #{idx}</b>", body_style), Paragraph(f"<b>{ev['original_filename']}</b>", body_style)],
                    [Paragraph("<b>Evidence ID:</b>", body_style), Paragraph(ev["id"], code_style)],
                    [Paragraph("<b>Container Format:</b>", body_style), Paragraph(f"{ev['file_format']} ({ev['width']} x {ev['height']} px)", body_style)],
                    [Paragraph("<b>File Size:</b>", body_style), Paragraph(f"{ev['file_size']:,} bytes ({ev['file_size'] / 1024:.1f} KB)", body_style)],
                    [Paragraph("<b>SHA-256 Digest:</b>", body_style), Paragraph(ev["sha256"], code_style)],
                    [Paragraph("<b>MD5 Digest:</b>", body_style), Paragraph(ev["md5"], code_style)],
                    [Paragraph("<b>Integrity Status:</b>", body_style), Paragraph(integrity_text, body_style)],
                ]
                ev_table = Table(ev_summary, colWidths=[120, 384])
                ev_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#F2F2F2")),
                    ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
                    ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EAEAEA")),
                    ('TOPPADDING', (0, 0), (-1, -1), 3),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ]))
                story.append(ev_table)
                story.append(Spacer(1, 8))

                # 4. EXIF Metadata Extraction Table
                if include_metadata:
                    try:
                        meta = MetadataService.extract_metadata(ev_path)
                        cam = meta["camera_info"]
                        cap = meta["capture_info"]
                        gps = meta["gps_info"]

                        meta_rows = [
                            [Paragraph("<b>Make / Model:</b>", body_style), Paragraph(f"{cam.get('make') or 'N/A'} / {cam.get('model') or 'N/A'}", body_style)],
                            [Paragraph("<b>Software Identifier:</b>", body_style), Paragraph(cam.get("software") or "None detected", body_style)],
                            [Paragraph("<b>Original Timestamp:</b>", body_style), Paragraph(cap.get("datetime_original") or "Unavailable", body_style)],
                            [Paragraph("<b>Exposure / Aperture / ISO:</b>", body_style), Paragraph(f"Exp: {cap.get('exposure_time') or 'N/A'} | f/{cap.get('f_number') or 'N/A'} | ISO {cap.get('iso') or 'N/A'}", body_style)],
                        ]

                        if gps.get("latitude") is not None and gps.get("longitude") is not None:
                            meta_rows.append([
                                Paragraph("<b>GPS Coordinates:</b>", body_style),
                                Paragraph(f"Lat: {gps['latitude']}°, Lon: {gps['longitude']}° (Alt: {gps.get('altitude', 'N/A')}m)", body_style)
                            ])
                        else:
                            meta_rows.append([
                                Paragraph("<b>GPS Coordinates:</b>", body_style),
                                Paragraph("No embedded GPS metadata tags found", body_style)
                            ])

                        meta_table = Table(meta_rows, colWidths=[140, 364])
                        meta_table.setStyle(TableStyle([
                            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#FAFAFA")),
                            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#DDDDDD")),
                            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EEEEEE")),
                            ('TOPPADDING', (0, 0), (-1, -1), 3),
                            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                        ]))
                        story.append(Paragraph("<b>Metadata Inspection Findings:</b>", h2_style))
                        story.append(meta_table)
                        story.append(Spacer(1, 8))
                    except Exception as e:
                        story.append(Paragraph(f"Metadata extraction notice: {e}", disclaimer_style))

                # 5. Error Level Analysis (ELA)
                if include_ela:
                    try:
                        ela_dir = settings.CASES_DIR / case["id"] / "derived" / "ela"
                        ela_res = ELAService.perform_ela(ev_path, output_dir=ela_dir, quality=95, scale=15)
                        
                        story.append(Paragraph("<b>Error Level Analysis (ELA) Evaluation:</b>", h2_style))
                        
                        ela_metrics = [
                            [Paragraph("<b>Target Image Format:</b>", body_style), Paragraph(ela_res["original_format"], body_style)],
                            [Paragraph("<b>Recompression Parameters:</b>", body_style), Paragraph(f"JPEG Quality: {ela_res['quality']}% | Scale Amplification: {ela_res['scale']}x", body_style)],
                            [Paragraph("<b>Mean Pixel Error:</b>", body_style), Paragraph(str(ela_res["mean_error"]), body_style)],
                            [Paragraph("<b>Peak Difference (Max):</b>", body_style), Paragraph(str(ela_res["max_error"]), body_style)],
                            [Paragraph("<b>Error Std Deviation:</b>", body_style), Paragraph(str(ela_res["error_standard_deviation"]), body_style)],
                            [Paragraph("<b>Observation:</b>", body_style), Paragraph(ela_res["anomaly_reason"], body_style)],
                        ]
                        ela_table = Table(ela_metrics, colWidths=[150, 354])
                        ela_table.setStyle(TableStyle([
                            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#F8F8F8")),
                            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
                            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EEEEEE")),
                            ('TOPPADDING', (0, 0), (-1, -1), 3),
                            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                        ]))
                        story.append(ela_table)
                        story.append(Spacer(1, 6))

                        # Embed ELA visualization image if exists
                        ela_artifact_file = Path(ela_res["artifact_path"])
                        if ela_artifact_file.exists():
                            try:
                                # Scale thumbnail appropriately for letter width
                                story.append(RLImage(str(ela_artifact_file), width=320, height=200))
                                story.append(Paragraph("<i>Figure: Amplified Error Level Analysis (ELA) difference map</i>", disclaimer_style))
                            except Exception:
                                pass
                        
                        if ela_res.get("format_warning"):
                            story.append(Paragraph(f"<b>Methodology Notice:</b> {ela_res['format_warning']}", disclaimer_style))

                        story.append(Spacer(1, 10))
                    except Exception as e:
                        story.append(Paragraph(f"ELA processing notice: {e}", disclaimer_style))

        # 6. Chain of Custody Log
        if include_chain_of_custody and audit_events:
            story.append(Paragraph("3. CHAIN OF CUSTODY AUDIT LOG", h2_style))
            audit_rows = [
                [Paragraph("<b>Timestamp (UTC)</b>", body_style), Paragraph("<b>Event Type</b>", body_style), Paragraph("<b>Operator</b>", body_style)]
            ]
            for evt in audit_events[:15]:
                audit_rows.append([
                    Paragraph(evt["timestamp"][:19], code_style),
                    Paragraph(evt["event_type"], code_style),
                    Paragraph(evt.get("examiner_name") or "SYSTEM", body_style)
                ])
            audit_table = Table(audit_rows, colWidths=[130, 240, 134])
            audit_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#EEEEEE")),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EAEAEA")),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            story.append(audit_table)
            story.append(Spacer(1, 14))

        # 7. Scientific Conclusion & Methodological Limitations
        story.append(Paragraph("4. SCIENTIFIC LIMITATIONS & METHODOLOGICAL NOTICE", h2_style))
        limitations_text = (
            "<b>Important Forensic Disclosures:</b><br/>"
            "1. <b>Cryptographic Fingerprints:</b> SHA-256 and MD5 hashes establish binary bit-level identity. "
            "A matching digest proves binary correspondence but does not independently establish authenticity of the original reference copy.<br/>"
            "2. <b>Error Level Analysis:</b> ELA visualizes compression inconsistencies across lossy JPEG quantization. "
            "Natural high-contrast textures, image boundaries, and legitimate multi-pass recompressions introduce error variance. "
            "ELA results are exploratory and do not constitute deterministic proof of manipulation.<br/>"
            "3. <b>Metadata Veracity:</b> Embedded EXIF structures can be fabricated or stripped without altering pixel rasters.<br/>"
            "4. <b>Local Host Environment:</b> Audit timestamps are governed by the local system clock. "
            "This report is issued under local analytical authority without third-party remote validation."
        )
        story.append(Paragraph(limitations_text, disclaimer_style))
        story.append(Spacer(1, 20))

        # Signature Line
        sig_data = [
            [Paragraph(f"<b>Examiner Signature:</b> ___________________________<br/><b>Date:</b> {generated_at}", body_style)]
        ]
        sig_table = Table(sig_data, colWidths=[504])
        sig_table.setStyle(TableStyle([
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(KeepTogether(sig_table))

        # Build document using NumberedCanvas
        doc.build(story, canvasmaker=NumberedCanvas)
        logger.info(f"Successfully generated PDF forensic report: {output_path}")

    @staticmethod
    def get_report(report_id: str) -> Optional[dict[str, Any]]:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM reports WHERE id = ?;", (report_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "id": row["id"],
                "case_id": row["case_id"],
                "evidence_id": row["evidence_id"],
                "report_format": row["report_format"],
                "file_path": row["file_path"],
                "file_size": row["file_size"],
                "title": row["title"],
                "examiner_name": row["examiner_name"],
                "generated_at": row["generated_at"],
                "download_url": f"/api/v1/reports/{row['id']}/download"
            }

    @staticmethod
    def list_reports(case_id: Optional[str] = None) -> list[dict[str, Any]]:
        query = "SELECT * FROM reports WHERE 1=1"
        params = []
        if case_id:
            query += " AND case_id = ?"
            params.append(case_id)
        query += " ORDER BY generated_at DESC"

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [
                {
                    "id": r["id"],
                    "case_id": r["case_id"],
                    "evidence_id": r["evidence_id"],
                    "report_format": r["report_format"],
                    "file_path": r["file_path"],
                    "file_size": r["file_size"],
                    "title": r["title"],
                    "examiner_name": r["examiner_name"],
                    "generated_at": r["generated_at"],
                    "download_url": f"/api/v1/reports/{r['id']}/download"
                }
                for r in rows
            ]
