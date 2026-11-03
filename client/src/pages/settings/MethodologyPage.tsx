import React from 'react';
import { Key, Sliders, FileText, Server } from 'lucide-react';

export const MethodologyPage: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1>FORENSIC METHODOLOGY & GUIDE</h1>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          SCIENTIFIC PRINCIPLES, ALGORITHMS & OPERATIONAL LIMITATIONS
        </div>
      </div>

      {/* The 3 Core Pillars */}
      <div className="grid-3" style={{ marginBottom: '24px' }}>
        {/* Pillar 1: EXIF */}
        <div className="panel">
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={14} /> 1. EXIF METADATA
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, margin: '8px 0', color: '#ffffff' }}>
            Embedded Camera Headers
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Exchangeable Image File Format (EXIF) stores the original camera make, model, lens, exposure settings (ISO, aperture, shutter), timestamps, software signatures (e.g. Photoshop), and GPS coordinates directly within the image container.
          </p>
        </div>

        {/* Pillar 2: Hashing */}
        <div className="panel">
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Key size={14} /> 2. CRYPTOGRAPHIC HASHING
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, margin: '8px 0', color: '#ffffff' }}>
            Bit-Level Fingerprinting
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Using SHA-256 and MD5, arbitrary image bitstreams are transformed into deterministic fixed-length digests. The <b>avalanche effect</b> guarantees that altering even a single pixel completely transforms the digest, providing mathematical proof of alteration.
          </p>
        </div>

        {/* Pillar 3: ELA */}
        <div className="panel">
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sliders size={14} /> 3. ERROR LEVEL ANALYSIS
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, margin: '8px 0', color: '#ffffff' }}>
            Compression Inconsistency
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            ELA resaves the suspect image at a known uniform JPEG quality (default 95%) and evaluates the amplified difference between original and recompressed pixels. Spliced or digitally modified elements often exhibit noticeable divergence in error amplitude.
          </p>
        </div>
      </div>

      {/* Deep Explanation Panel */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div className="panel-header">
          <span className="panel-title">METHODOLOGICAL LIMITATIONS & FORENSIC DISCLOSURE</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '10px' }}>
            <b>No Automated Absolute Proof:</b> No single forensic algorithm can independently prove an image is genuine or forged. Forensic tools surface observable technical anomalies; human expert analysis and contextual verification are always required.
          </p>
          <p style={{ marginBottom: '10px' }}>
            <b>Binary Identity vs Provenance:</b> A matching cryptographic hash verifies that two files have identical byte streams. However, it does not prove that the initial reference file was unedited prior to capture.
          </p>
          <p style={{ marginBottom: '10px' }}>
            <b>JPEG ELA Characteristics:</b> Natural high-contrast transitions (such as tree foliage or sharp building edges) naturally produce elevated ELA error values without indicating digital tampering. ELA is an exploratory tool.
          </p>
          <p>
            <b>Metadata Fragility:</b> EXIF tags can be stripped or modified by basic utilities or social media platforms without modifying image pixel data.
          </p>
        </div>
      </div>

      {/* Local Airgap Guarantee */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Server size={14} /> STRICT OFFLINE AIRGAP ARCHITECTURE
          </span>
          <span className="badge badge-match">LOCAL AIRGAP VERIFIED</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          PixelTrace operates exclusively on loopback (<code>127.0.0.1:8000</code>).
          Uploaded image bytes, EXIF metadata, and generated forensic reports are never uploaded to the cloud, remote APIs, or third-party tracking services. All processing executes on your local hardware.
        </div>
      </div>
    </div>
  );
};
