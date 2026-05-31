import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

// ── Server component — no auth required ───────────────────────────────────────

interface Props { params: { certId: string } }

export async function generateMetadata({ params }: Props) {
  return {
    title:       `Certificate Verification · BAUIN`,
    description: `Verify BAUIN certification ${params.certId}`,
  };
}

// ── Teal/green icon ──────────────────────────────────────────────────────────

function VerifiedBadge() {
  return (
    <div className="w-20 h-20 rounded-full bg-[#1A6659] flex items-center justify-center mx-auto mb-4 shadow-lg">
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}
        strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    </div>
  );
}

function NotFoundView({ certId }: { certId: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Certificate Not Found</h1>
        <p className="text-gray-500 text-sm mb-4">
          No certificate with ID <span className="font-mono font-semibold text-gray-700">{certId}</span> was found.
        </p>
        <p className="text-xs text-gray-400">
          If you believe this is an error, contact support@bauin.com
        </p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default async function VerifyCertPage({ params }: Props) {
  const { certId } = params;

  const cert = await prisma.userCertificate.findUnique({
    where:   { publicId: certId },
    include: {
      user:     { select: { name: true } },
      category: { select: { name: true } },
    },
  }).catch(() => null);

  if (!cert) return <NotFoundView certId={certId} />;

  const issuedStr = cert.issuedAt.toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FAF7] to-[#E8F5F0] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">

        {/* Verified card */}
        <div className="bg-white rounded-3xl shadow-xl border border-[#D0EDE6] overflow-hidden">

          {/* Teal header */}
          <div className="bg-[#1A6659] px-8 py-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-md bg-[#F0B429] flex items-center justify-center">
                <span className="text-[#1A6659] font-black text-sm">B</span>
              </div>
              <span className="text-white font-bold text-lg tracking-wide">BAUIN</span>
            </div>
            <p className="text-[#A8D8CE] text-xs font-medium tracking-widest uppercase">
              Certificate Verification
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-8 text-center space-y-5">

            {/* Verified badge */}
            <VerifiedBadge />
            <div>
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-200">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Verified & Authentic
              </span>
            </div>

            {/* Holder name */}
            <div>
              <p className="text-sm text-gray-400 font-medium mb-0.5">This certifies that</p>
              <h2 className="text-2xl font-bold text-gray-900">{cert.user.name}</h2>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Certification</p>
                <p className="text-sm font-bold text-gray-800 leading-tight">{cert.category.name}</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Score</p>
                <p className="text-sm font-bold text-[#1A6659]">{cert.score}%</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Issued</p>
                <p className="text-sm font-semibold text-gray-800">{issuedStr}</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Cert ID</p>
                <p className="text-sm font-mono font-bold text-gray-800 tracking-widest">{certId}</p>
              </div>
            </div>

            {/* Download PDF link */}
            {cert.certificateUrl && (
              <a
                href={cert.certificateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#1A6659] hover:bg-[#0E4A3D] text-white font-semibold text-sm py-3 px-6 rounded-2xl transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Certificate (PDF)
              </a>
            )}

          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-100 px-8 py-4 text-center">
            <p className="text-xs text-gray-400">
              This certificate was issued by BAUIN · Billionaires AI Users Income Network ·{" "}
              <a href="https://bauin.com" className="text-[#1A6659] hover:underline">bauin.com</a>
            </p>
          </div>
        </div>

        {/* Powered by note */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Verified on {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>
    </div>
  );
}
