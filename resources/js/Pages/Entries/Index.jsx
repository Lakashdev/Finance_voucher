import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import Select from 'react-select';
import { useMemo, useState } from 'react';

const formatMoney = (n) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number(n || 0));

const formatDate = (s) => {
  if (!s) return '-';
  const d = new Date(s);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).format(d);
};

export default function EntriesIndex({ entries, accounts = [], filters = {}, totals }) {
  // Build react-select options for accounts
  const accountOptions = useMemo(
    () => accounts.map(a => ({ value: String(a.id), label: `${a.name} (${a.code})` })),
    [accounts]
  );

  // Local filter state (initialized from server)
  const [q, setQ] = useState(filters.q || '');
  const [account, setAccount] = useState(
    accountOptions.find(o => o.value === String(filters.account_id || '')) || null
  );
  const [side, setSide] = useState(filters.side || '');
  const [status, setStatus] = useState(filters.status || '');
  const [dateFrom, setDateFrom] = useState(filters.date_from || '');
  const [dateTo, setDateTo] = useState(filters.date_to || '');
  const [min, setMin] = useState(filters.min ?? '');
  const [max, setMax] = useState(filters.max ?? '');

  const submit = (e) => {
    e.preventDefault();
    router.get(route('entries.index'), {
      q,
      account_id: account?.value || '',
      side: side || '',
      status: status || '',
      date_from: dateFrom || '',
      date_to: dateTo || '',
      min: min || '',
      max: max || '',
    }, { preserveScroll: true, replace: true });
  };

  const reset = () => {
    setQ(''); setAccount(null); setSide(''); setStatus('');
    setDateFrom(''); setDateTo(''); setMin(''); setMax('');
    router.get(route('entries.index'), {}, { preserveScroll: true, replace: true });
  };

const exportUrl = route('entries.export', {
  q,
  account_id: account?.value || '',
  side: side || '',
  status: status || '',
  date_from: dateFrom || '',
  date_to: dateTo || '',
  min: min || '',
  max: max || '',
});

  return (
    <AuthenticatedLayout header={<h2 className="m-0">Voucher Entries</h2>}>
      <Head title="Voucher Entries" />

      {/* Filters */}
      <form className="card mb-3" onSubmit={submit}>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-4">
              <label className="form-label">Account</label>
              <Select
                options={accountOptions}
                value={account}
                onChange={setAccount}
                isClearable
                placeholder="All accounts"
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Side</label>
              <select className="form-select" value={side} onChange={(e)=>setSide(e.target.value)}>
                <option value="">All</option>
                <option value="dr">Debit</option>
                <option value="cr">Credit</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Status</label>
              <select className="form-select" value={status} onChange={(e)=>setStatus(e.target.value)}>
                <option value="">All</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Date from</label>
              <input type="date" className="form-control" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label">Date to</label>
              <input type="date" className="form-control" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} />
            </div>

            <div className="col-md-2">
              <label className="form-label">Min amount</label>
              <input type="number" step="0.01" className="form-control" value={min} onChange={(e)=>setMin(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label">Max amount</label>
              <input type="number" step="0.01" className="form-control" value={max} onChange={(e)=>setMax(e.target.value)} />
            </div>

            <div className="col-md-4">
              <label className="form-label">Search (JV no. / Narration)</label>
              <input className="form-control" placeholder="e.g. JV-2025-000008 or text…" value={q} onChange={(e)=>setQ(e.target.value)} />
            </div>

            <div className="col-md-4 d-flex align-items-end gap-2">
              <button className="btn btn-primary">Filter</button>
              <button type="button" className="btn btn-outline-secondary" onClick={reset}>Reset</button>
            </div>

            <a href={exportUrl} className="btn btn-outline-success">Export CSV</a>
          </div>
        </div>
      </form>

      {/* Totals for filtered set */}
      <div className="alert alert-info py-2">
        <strong>Totals (filtered):</strong>
        <span className="ms-3">Debit: {formatMoney(totals?.dr || 0)}</span>
        <span className="ms-3">Credit: {formatMoney(totals?.cr || 0)}</span>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="table align-middle table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th style={{width: '110px'}}>Date</th>
                <th>JV No.</th>
                <th>Account</th>
                <th style={{width:'80px'}}>Side</th>
                <th style={{width:'160px'}} className="text-end">Amount</th>
                <th>Allocations</th> {/* 👈 NEW */}
                <th>Narration</th>
                <th style={{width:'110px'}}>Status</th>
                <th style={{width:'80px'}}></th>
              </tr>
            </thead>
            <tbody>
              {entries.data.length === 0 && (
                <tr><td colSpan="9" className="text-center py-4">No entries found.</td></tr>
              )}

              {entries.data.map((e) => {
                const isDebit = Number(e.debit) > 0;
                const side = isDebit ? 'dr' : 'cr';
                const amount = isDebit ? e.debit : e.credit;

                const assoc = Array.isArray(e.associates) ? e.associates : [];

                return (
                  <tr key={e.id}>
                    <td>{formatDate(e.voucher?.transaction_date)}</td>
                    <td className="fw-semibold">{e.voucher?.jv_number}</td>
                    <td>
                      <div className="fw-semibold">{e.account?.name}</div>
                      <div className="text-muted small">{e.account?.code}</div>
                    </td>
                    <td className="text-uppercase">{side}</td>
                    <td className="text-end">{formatMoney(amount)}</td>

                    {/* NEW Allocations cell */}
                    <td style={{minWidth: 280}}>
                      {assoc.length === 0 ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <ul className="mb-0 small ps-3">
                          {assoc.map((a, i) => (
                            <li key={i}>
                              <span className="text-uppercase">{a.side}</span>{' '}
                              {a.account?.name} ({a.account?.code}) — {formatMoney(a.amount)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>

                    <td className="text-truncate" style={{maxWidth:320}} title={e.voucher?.narration || ''}>
                      {e.voucher?.narration || <span className="text-muted">—</span>}
                    </td>
                    <td>
                      <span className="badge bg-secondary text-capitalize">{e.voucher?.status}</span>
                    </td>
                    <td className="text-end">
                      {e.voucher?.id && (
                        <Link href={route('vouchers.show', e.voucher.id)} className="btn btn-sm btn-outline-secondary">
                          View
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="card-body d-flex justify-content-between">
          <div>Showing {entries.from || 0}-{entries.to || 0} of {entries.total}</div>
          <div className="btn-group">
            {entries.links?.map((l, i) => (
              <button
                key={i}
                className={`btn btn-sm ${l.active ? 'btn-primary' : 'btn-outline-primary'}`}
                disabled={!l.url}
                onClick={() => l.url && router.visit(l.url, { preserveScroll: true })}
                dangerouslySetInnerHTML={{ __html: l.label }}
              />
            ))}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
