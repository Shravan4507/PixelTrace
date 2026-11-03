import io
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, KeepTogether
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from backend.app.config import settings
from backend.app.core.logging import logger

# Register D-DIN fonts if available
FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"
FONT_ITALIC = "Helvetica-Oblique"

try:
    reg_path = settings.FONTS_DIR / "D-DIN.ttf"
    bld_path = settings.FONTS_DIR / "D-DIN-Bold.ttf"
    ita_path = settings.FONTS_DIR / "D-DIN-Italic.ttf"
    if reg_path.exists():
        pdfmetrics.registerFont(TTFont("D-DIN", str(reg_path)))
        FONT_REGULAR = "D-DIN"
    if bld_path.exists():
        pdfmetrics.registerFont(TTFont("D-DIN-Bold", str(bld_path)))
        FONT_BOLD = "D-DIN-Bold"
    if ita_path.exists():
        pdfmetrics.registerFont(TTFont("D-DIN-Italic", str(ita_path)))
        FONT_ITALIC = "D-DIN-Italic"
except Exception as e:
    logger.warning(f"Report font fallback: {e}")


class SimpleNumberedCanvas(canvas.Canvas):
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
        self.setFont(FONT_REGULAR, 8)
        self.setFillColor(colors.HexColor("#666666"))
        self.drawString(54, 36, "PIXELTRACE DIGITAL FORENSICS // ANALYSIS REPORT")
        self.drawRightString(letter[0] - 54, 36, f"PAGE {self._pageNumber} OF {page_count}")
        self.setStrokeColor(colors.HexColor("#333333"))
        self.setLineWidth(0.5)
        self.line(54, 48, letter[0] - 54, 48)
        self.restoreState()


class DirectReportService:
    @classmethod
    def generate_pdf(
        cls,
        filename: str,
        file_size: int,
        format_name: str,
        dimensions: str,
        sha256_hash: str,
        md5_hash: str,
        metadata: dict[str, Any],
        ela_data: Optional[dict[str, Any]] = None,
        ela_image_path: Optional[str] = None,
        examiner_name: str = "Forensic Examiner"
    ) -> Path:
        report_id = str(uuid.uuid4())
        out_dir = settings.DATA_DIR / "reports"
        out_dir.mkdir(parents=True, exist_ok=True)
        pdf_path = out_dir / f"report_{report_id}.pdf"

        now_dt = datetime.now(timezone.utc)
        now_str = now_dt.strftime("%Y-%m-%d %H:%M:%S UTC")

        doc = SimpleDocTemplate(
            str(pdf_path),
            pagesize=letter,
            leftMargin=54,
            rightMargin=54,
            topMargin=54,
            bottomMargin=54
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle("T", fontName=FONT_BOLD, fontSize=18, leading=22, textColor=colors.HexColor("#000000"))
        sub_style = ParagraphStyle("S", fontName=FONT_REGULAR, fontSize=9, leading=12, textColor=colors.HexColor("#555555"))
        h2_style = ParagraphStyle("H", fontName=FONT_BOLD, fontSize=11, leading=14, textColor=colors.HexColor("#000000"), spaceBefore=12, spaceAfter=6, keepWithNext=True)
        body_style = ParagraphStyle("B", fontName=FONT_REGULAR, fontSize=9, leading=12, textColor=colors.HexColor("#222222"))
        code_style = ParagraphStyle("C", fontName=FONT_REGULAR, fontSize=8, leading=10, textColor=colors.HexColor("#111111"))
        note_style = ParagraphStyle("N", fontName=FONT_ITALIC, fontSize=8, leading=11, textColor=colors.HexColor("#555555"))

        story = []

        # Header
        header_data = [[
            Paragraph("<b>PIXELTRACE</b> // DIGITAL IMAGE FORENSICS", ParagraphStyle("HdrL", fontName=FONT_BOLD, fontSize=11, textColor=colors.HexColor("#000000"))),
            Paragraph("FORENSIC EXAMINATION DOSSIER", ParagraphStyle("HdrR", fontName=FONT_REGULAR, fontSize=9, alignment=2, textColor=colors.HexColor("#555555")))
        ]]
        header_table = Table(header_data, colWidths=[300, 204])
        header_table.setStyle(TableStyle([
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LINEBELOW', (0, 0), (-1, -1), 1, colors.HexColor("#000000"))
        ]))
        story.append(header_table)
        story.append(Spacer(1, 14))

        story.append(Paragraph(f"FORENSIC REPORT: {filename.upper()}", title_style))
        story.append(Paragraph(f"REPORT ID: {report_id} &nbsp;|&nbsp; EXAMINER: {examiner_name} &nbsp;|&nbsp; DATE: {now_str}", sub_style))
        story.append(Spacer(1, 10))

        # 1. File & Hashes
        story.append(Paragraph("1. EVIDENCE CONTAINER & CRYPTOGRAPHIC INTEGRITY", h2_style))
        prop_rows = [
            [Paragraph("<b>Target Filename:</b>", body_style), Paragraph(filename, body_style),
             Paragraph("<b>Container Format:</b>", body_style), Paragraph(format_name, body_style)],
            [Paragraph("<b>Dimensions:</b>", body_style), Paragraph(dimensions, body_style),
             Paragraph("<b>File Size:</b>", body_style), Paragraph(f"{file_size:,} bytes ({(file_size/1024):.1f} KB)", body_style)],
            [Paragraph("<b>SHA-256 Digest:</b>", body_style), Paragraph(sha256_hash, code_style), Paragraph("", body_style), Paragraph("", body_style)],
            [Paragraph("<b>MD5 Digest:</b>", body_style), Paragraph(md5_hash, code_style), Paragraph("", body_style), Paragraph("", body_style)],
        ]
        prop_table = Table(prop_rows, colWidths=[95, 230, 95, 84])
        prop_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8F8F8")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EEEEEE")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('SPAN', (1, 2), (3, 2)),
            ('SPAN', (1, 3), (3, 3)),
        ]))
        story.append(prop_table)
        story.append(Spacer(1, 12))

        # 2. EXIF Metadata
        story.append(Paragraph("2. EXIF METADATA INSPECTION", h2_style))
        cam = metadata.get("camera_info", {})
        cap = metadata.get("capture_info", {})
        gps = metadata.get("gps_info", {})

        meta_rows = [
            [Paragraph("<b>Camera Make/Model:</b>", body_style), Paragraph(f"{cam.get('make') or 'N/A'} {cam.get('model') or ''}".strip() or 'N/A', body_style)],
            [Paragraph("<b>Software Identifier:</b>", body_style), Paragraph(cam.get("software") or "None detected", body_style)],
            [Paragraph("<b>Original Date/Time:</b>", body_style), Paragraph(cap.get("datetime_original") or "Unavailable", body_style)],
            [Paragraph("<b>Exposure Parameters:</b>", body_style), Paragraph(f"Exp: {cap.get('exposure_time') or 'N/A'} | f/{cap.get('f_number') or 'N/A'} | ISO: {cap.get('iso') or 'N/A'} | Focal: {cap.get('focal_length') or 'N/A'}", body_style)],
        ]
        if gps.get("latitude") is not None and gps.get("longitude") is not None:
            meta_rows.append([
                Paragraph("<b>GPS Coordinates:</b>", body_style),
                Paragraph(f"Lat: {gps['latitude']}°, Lon: {gps['longitude']}° (Alt: {gps.get('altitude', 'N/A')}m)", body_style)
            ])
        else:
            meta_rows.append([
                Paragraph("<b>GPS Coordinates:</b>", body_style),
                Paragraph("No embedded GPS tags found", body_style)
            ])

        meta_table = Table(meta_rows, colWidths=[130, 374])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#FAFAFA")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EEEEEE")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 12))

        # 3. Error Level Analysis
        if ela_data:
            story.append(Paragraph("3. ERROR LEVEL ANALYSIS (ELA) EVALUATION", h2_style))
            ela_rows = [
                [Paragraph("<b>Recompression Setting:</b>", body_style), Paragraph(f"JPEG Quality: {ela_data.get('quality', 95)}% | Scale: {ela_data.get('scale', 15)}x", body_style)],
                [Paragraph("<b>Mean Pixel Error:</b>", body_style), Paragraph(str(ela_data.get('mean_error', 0.0)), body_style)],
                [Paragraph("<b>Peak Residual (Max):</b>", body_style), Paragraph(str(ela_data.get('max_error', 0)), body_style)],
                [Paragraph("<b>Standard Deviation:</b>", body_style), Paragraph(str(ela_data.get('error_standard_deviation', 0.0)), body_style)],
                [Paragraph("<b>Observation:</b>", body_style), Paragraph(ela_data.get('anomaly_reason', ''), body_style)],
            ]
            ela_table = Table(ela_rows, colWidths=[130, 374])
            ela_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#F8F8F8")),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EEEEEE")),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            story.append(ela_table)
            story.append(Spacer(1, 8))

            if ela_image_path and Path(ela_image_path).exists():
                try:
                    story.append(RLImage(str(ela_image_path), width=320, height=200))
                    story.append(Paragraph("<i>Figure: Error Level Analysis (ELA) Amplified Pixel Difference Map</i>", note_style))
                except Exception:
                    pass

        story.append(Spacer(1, 14))

        # 4. Methodological Notice
        story.append(Paragraph("4. SCIENTIFIC LIMITATIONS & DISCLOSURE", h2_style))
        disclaimer = (
            "Cryptographic hashes verify bitstream equality. ELA highlights compression inconsistencies across "
            "lossy JPEG quantization matrices; natural texture transitions or contrast borders can produce variance. "
            "EXIF tags can be stripped or modified. PixelTrace outputs empirical technical observations to assist "
            "human forensic evaluation without asserting autonomous authenticity claims."
        )
        story.append(Paragraph(disclaimer, note_style))
        story.append(Spacer(1, 20))

        # Signature
        sig = [[Paragraph(f"<b>Examiner Signature:</b> ___________________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>Date:</b> {now_str[:10]}", body_style)]]
        sig_table = Table(sig, colWidths=[504])
        story.append(KeepTogether(sig_table))

        doc.build(story, canvasmaker=SimpleNumberedCanvas)
        return pdf_path
