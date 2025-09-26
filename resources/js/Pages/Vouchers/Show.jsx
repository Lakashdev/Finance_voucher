// resources/js/Pages/Vouchers/Show.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

// --- helpers ----------------------------------------------------
const formatMoney = (n) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number(n || 0));

const formatDate = (s) => {
  if (!s) return '-';
  const d = new Date(s);
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
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

export default function Show({ voucher, company }) {
  // company can be passed from backend; fallbacks shown here
  const companyName = company?.name ?? 'Innovative Solution Pvt. Ltd.';
  const companyAddr = company?.address ?? 'Chakupat, Lalitpur';

  // Split lines: Debits first, then Credits
  const debits  = (voucher.lines || []).filter(l => Number(l.debit || 0)  > 0);
  const credits = (voucher.lines || []).filter(l => Number(l.credit || 0) > 0);

  const totals = (voucher.lines || []).reduce(
    (t, l) => ({ dr: t.dr + Number(l.debit || 0), cr: t.cr + Number(l.credit || 0) }),
    { dr: 0, cr: 0 }
  );
  const grand = totals.dr || totals.cr; // they should be equal by rule
  const amountInWords = `Rupees ${toWordsIndian(grand)} Only`;

  // Reusable row renderer with running serial number
  const renderRow = (l, sn) => (
    <tr key={l.id ?? `${l.account_code}-${sn}`}>
      <td className="text-center">{sn}</td>
      <td>
        <div className="fw-semibold">{l.account_name}</div>
      </td>
      <td className="text-center">{l.account_code ?? '-'}</td>
      <td className="text-end">{l.debit  ? formatMoney(l.debit)  : ''}</td>
      <td className="text-end">{l.credit ? formatMoney(l.credit) : ''}</td>
    </tr>
  );

  return (
    <AuthenticatedLayout header={<h2 className="m-0">Voucher {voucher.jv_number}</h2>}>
      <Head title={`Voucher ${voucher.jv_number}`} />

      {/* PRINT-ONLY CSS: show only the voucher on print */}
      <style>{`
        @page { size: A4 portrait; margin: 12mm; }

        @media print {
          /* Hide everything by default… */
          body * { visibility: hidden; }

          /* …except the voucher area */
          .voucher-print, .voucher-print * { visibility: visible; }

          /* Position voucher at the top-left for clean PDF */
          .voucher-print {
            position: absolute;
            inset: 0 auto auto 0;
            right: 0;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #fff !important;
          }

          /* Never print toolbars/nav */
          .d-print-none { display: none !important; }
        }
      `}</style>

      {/* Toolbar (won't print) */}
      <div className="mb-3 d-print-none">
        <Link href={route('vouchers.index')} className="btn btn-outline-secondary btn-sm me-2">
          ← Back to list
        </Link>
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      {/* Voucher sheet (only this prints) */}
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
              {/* Debits section */}
              {debits.length > 0 && (
                <>
                  <tr className="table-light">
                    <td colSpan={5} className="fw-semibold">Debits</td>
                  </tr>
                  {debits.map((l, i) => renderRow(l, i + 1))}
                </>
              )}

              {/* Credits section */}
              {credits.length > 0 && (
                <>
                  <tr className="table-light">
                    <td colSpan={5} className="fw-semibold">Credits</td>
                  </tr>
                  {credits.map((l, i) => renderRow(l, debits.length + i + 1))}
                </>
              )}

              {/* If there were no lines at all */}
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
          <div className="col-12">
            <strong>Narration:</strong>
            <div className="voucher-narration mt-1">
              {voucher.narration || <span className="text-muted">—</span>}
            </div>
          </div>
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
    </AuthenticatedLayout>
  );
}
