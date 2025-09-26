// resources/js/Pages/Vouchers/ShowApproval.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

// --- helpers (mirroring Show.jsx) --------------------------------------------
const formatMoney = (n) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number(n || 0));

const formatDate = (s) => {
  if (!s) return '-';
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? s
    : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
};

// very small “Indian style” words converter (up to 999,99,99,999)
const toWordsIndian = (num) => {
  num = Math.round(Number(num || 0));
  if (num === 0) return 'Zero';
  const a = ['', 'One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const u = (n) => (n < 20 ? a[n] : b[Math.floor(n/10)] + (n%10? ' ' + a[n%10] : ''));
  const s = (n, w) => (n ? (u(n) + ' ' + w + ' ') : '');
  const c = (n) => (n ? (u(n) + ' ') : '');
  const p = (n, d) => Math.floor(n / d);

  let n = num;
  let out = '';
  out += s(p(n, 10000000), 'Crore'); n %= 10000000;
  out += s(p(n, 100000), 'Lakh');    n %= 100000;
  out += s(p(n, 1000), 'Thousand');  n %= 1000;
  out += s(p(n, 100), 'Hundred');    n %= 100;
  out += (out && n ? 'and ' : '') + c(n);
  return out.trim();
};

// -----------------------------------------------------------------------------

export default function ShowApproval({ voucher, canApprove, company }) {
  // optional company info (fallbacks like Show.jsx)
  const companyName = company?.name ?? 'Innovative Solution Pvt. Ltd.';
  const companyAddr = company?.address ?? 'Chakupat, Lalitpur';

  // split lines like Show.jsx: Debits first, then Credits
  const debits = useMemo(
    () => (voucher.lines || []).filter(l => Number(l.debit || 0) > 0),
    [voucher.lines]
  );
  const credits = useMemo(
    () => (voucher.lines || []).filter(l => Number(l.credit || 0) > 0),
    [voucher.lines]
  );

  const totals = useMemo(() => {
    let dr = 0, cr = 0;
    (voucher.lines || []).forEach(l => { dr += Number(l.debit || 0); cr += Number(l.credit || 0); });
    return { dr, cr };
  }, [voucher.lines]);

  const grand = totals.dr || totals.cr; // should be equal
  const amountInWords = `Rupees ${toWordsIndian(grand)} Only`;

  const [showReject, setShowReject] = useState(false);
  const rejForm = useForm({ reject_reason: '' });

  const approve = () => {
    if (!confirm(`Approve voucher ${voucher.jv_number}?`)) return;
    router.patch(route('vouchers.approve.one', voucher.id), {}, {
      preserveScroll: true,
      onSuccess: () => router.visit(route('vouchers.approve')),
    });
  };

  const submitReject = () => {
    rejForm.patch(route('vouchers.reject', voucher.id), {
      preserveScroll: true,
      onSuccess: () => { setShowReject(false); rejForm.reset(); router.visit(route('vouchers.approve')); },
    });
  };

  // reusable row renderer (matches Show.jsx columns)
  const renderRow = (l, sn) => (
    <tr key={l.id ?? `${l.account_code}-${sn}`}>
      <td className="text-center">{sn}</td>
      <td>
        <div className="fw-semibold">{l.account_name || '-'}</div>
      </td>
      <td className="text-center">{l.account_code ?? '-'}</td>
      <td className="text-end">{l.debit  ? formatMoney(l.debit)  : ''}</td>
      <td className="text-end">{l.credit ? formatMoney(l.credit) : ''}</td>
    </tr>
  );

  return (
    <AuthenticatedLayout header={<h2 className="m-0">Approve: {voucher.jv_number}</h2>}>
      <Head title={`Approve ${voucher.jv_number}`} />

      {/* PRINT-ONLY CSS (copied from Show.jsx, adjusted) */}
      <style>{`
        @page { size: A4 portrait; margin: 12mm; }
        @media print {
          body * { visibility: hidden; }
          .voucher-print, .voucher-print * { visibility: visible; }
          .voucher-print {
            position: absolute;
            inset: 0 auto auto 0;
            right: 0;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #fff !important;
          }
          .d-print-none { display: none !important; }
        }
      `}</style>

      {/* Toolbar (won't print) */}
      <div className="mb-3 d-print-none d-flex justify-content-between align-items-center">
        <div>
          <Link href={route('vouchers.approve')} className="btn btn-outline-secondary btn-sm me-2">
            ← Back to approvals
          </Link>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
            Print / Save PDF
          </button>
        </div>

        {canApprove && (
          <div className="d-flex gap-2">
            <button className="btn btn-success btn-sm" onClick={approve}>
              Approve
            </button>
            <button className="btn btn-outline-danger btn-sm" onClick={() => setShowReject(true)}>
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Voucher sheet (prints cleanly) */}
      <div className="voucher-sheet voucher-print bg-white p-4" style={{ maxWidth: 900, margin: '0 auto', border: '1px solid #ddd' }}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h3 className="m-0 fw-semibold">{companyName}</h3>
            <div className="text-muted">{companyAddr}</div>
          </div>
          <div className="text-end small" style={{ minWidth: 220 }}>
            <div><strong>J.V. No.</strong> <span className="ms-2">{voucher.jv_number}</span></div>
            <div><strong>Date</strong> <span className="ms-2">{formatDate(voucher.transaction_date)}</span></div>
            <div className="text-capitalize"><strong>Status</strong> <span className="ms-2">{voucher.status}</span></div>
          </div>
        </div>

        <h5 className="text-center mt-3 mb-2">JOURNAL VOUCHER</h5>

        {/* Grid */}
        <div className="table-responsive">
          <table className="table table-bordered voucher-grid mb-2">
            <thead>
              <tr>
                <th style={{ width: '6%' }}>S.N.</th>
                <th>Particulars</th>
                <th style={{ width: '10%' }}>L/F</th>
                <th style={{ width: '18%' }} className="text-end">Debit Amount (Rs.)</th>
                <th style={{ width: '18%' }} className="text-end">Credit Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {/* Debits */}
              {debits.length > 0 && (
                <>
                  <tr className="table-light">
                    <td colSpan={5} className="fw-semibold">Debits</td>
                  </tr>
                  {debits.map((l, i) => renderRow(l, i + 1))}
                </>
              )}

              {/* Credits */}
              {credits.length > 0 && (
                <>
                  <tr className="table-light">
                    <td colSpan={5} className="fw-semibold">Credits</td>
                  </tr>
                  {credits.map((l, i) => renderRow(l, debits.length + i + 1))}
                </>
              )}

              {/* No lines */}
              {debits.length === 0 && credits.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted">No lines.</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={3} className="text-end">Total</th>
                <th className="text-end">{formatMoney(totals.dr)}</th>
                <th className="text-end">{formatMoney(totals.cr)}</th>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* In words & Narration */}
        <div className="row g-2 small">
          <div className="col-12">
            <strong>In words:</strong> <span className="ms-2">{amountInWords}</span>
          </div>
          {voucher.narration && (
            <div className="col-12">
              <strong>Narration:</strong>
              <div className="voucher-narration mt-1">
                {voucher.narration}
              </div>
            </div>
          )}
        </div>

        {/* Signatures */}
        <div className="row g-3 mt-4 text-center small">
          <div className="col-6 col-md-3">
            <div className="sig-box" style={{ borderBottom: '1px solid #333', height: 24 }}></div>
            <div className="mt-1">Prepared by</div>
            <div className="fw-semibold">{voucher.prepared_by || ''}</div>
          </div>
          <div className="col-6 col-md-3">
            <div className="sig-box" style={{ borderBottom: '1px solid #333', height: 24 }}></div>
            <div className="mt-1">Checked by</div>
            <div className="fw-semibold">{voucher.checked_by || ''}</div>
          </div>
          <div className="col-6 col-md-3 mt-3 mt-md-0">
            <div className="sig-box" style={{ borderBottom: '1px solid #333', height: 24 }}></div>
            <div className="mt-1">Received by</div>
          </div>
          <div className="col-6 col-md-3 mt-3 mt-md-0">
            <div className="sig-box" style={{ borderBottom: '1px solid #333', height: 24 }}></div>
            <div className="mt-1">Approved by</div>
          </div>
        </div>
      </div>

      {/* Reject modal (same behavior, non-printing) */}
      {showReject && (
        <>
          <div
            className="modal d-block d-print-none"
            style={{ display: 'block', zIndex: 1055 }}
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Reject {voucher.jv_number}</h5>
                  <button className="btn-close" onClick={() => setShowReject(false)} />
                </div>

                <div className="modal-body">
                  <label className="form-label">Reason</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={rejForm.data.reject_reason ?? ''}
                    onChange={(e) => rejForm.setData('reject_reason', e.target.value)}
                    autoFocus
                  />
                  {rejForm.errors.reject_reason && (
                    <div className="text-danger small mt-1">{rejForm.errors.reject_reason}</div>
                  )}
                </div>

                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowReject(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-danger" onClick={submitReject} disabled={rejForm.processing}>
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            className="modal-backdrop show d-print-none"
            style={{ zIndex: 1050, pointerEvents: 'none' }}
          />
        </>
      )}
    </AuthenticatedLayout>
  );
}
