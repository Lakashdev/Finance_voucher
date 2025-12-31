import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import Select from 'react-select';
import { useMemo, useState } from 'react';

const formatMoney = (n) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number(n || 0));

export default function TrialBalanceIndex({ rows, accounts = [], filters = {}, totals }) {
  const accountOptions = useMemo(
    () => accounts.map(a => ({ value: String(a.id), label: `${a.name} (${a.code})` })),
    [accounts]
  );

  const [account, setAccount] = useState(
    accountOptions.find(o => o.value === String(filters.account_id || '')) || null
  );
  const [status, setStatus] = useState(filters.status || '');
  const [dateFrom, setDateFrom] = useState(filters.date_from || '');
  const [dateTo, setDateTo] = useState(filters.date_to || '');

  const submit = (e) => {
    e.preventDefault();
    router.get(route('trial-balance.index'), {
      account_id: account?.value || '',
      status: status || '',
      date_from: dateFrom || '',
      date_to: dateTo || '',
    }, { preserveScroll: true, replace: true });
  };

  const reset = () => {
    setAccount(null); setStatus(''); setDateFrom(''); setDateTo('');
    router.get(route('trial-balance.index'), {}, { preserveScroll: true, replace: true });
  };

  const exportUrl = route('trial-balance.export', {
    account_id: account?.value || '',
    status: status || '',
    date_from: dateFrom || '',
    date_to: dateTo || '',
  });

  return (
    <AuthenticatedLayout header={<h2 className="m-0">Trial Balance</h2>}>
      <Head title="Trial Balance" />

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

            <div className="col-md-4 d-flex align-items-end gap-2">
              <button className="btn btn-primary">Filter</button>
              <button type="button" className="btn btn-outline-secondary" onClick={reset}>Reset</button>
              <a href={exportUrl} className="btn btn-outline-success">Export CSV</a>
            </div>
          </div>
        </div>
      </form>

      {/* Totals */}
      <div className="alert alert-info py-2">
        <strong>Totals (filtered):</strong>
        <span className="ms-3">Debit: {formatMoney(totals?.dr || 0)}</span>
        <span className="ms-3">Credit: {formatMoney(totals?.cr || 0)}</span>
        <span className="ms-3">
          Difference: {formatMoney(Math.abs((totals?.dr || 0) - (totals?.cr || 0)))}
        </span>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="table align-middle table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th style={{width:'110px'}}>Code</th>
                <th>Account</th>
                <th className="text-end" style={{width:'160px'}}>Debit</th>
                <th className="text-end" style={{width:'160px'}}>Credit</th>
                <th className="text-end" style={{width:'200px'}}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.data.length === 0 && (
                <tr><td colSpan="5" className="text-center py-4">No accounts found.</td></tr>
              )}

              {rows.data.map((r) => {
                const dr = Number(r.dr || 0);
                const cr = Number(r.cr || 0);
                const bal = Math.abs(dr - cr);
                const side = dr >= cr ? 'Dr' : 'Cr';

                return (
                  <tr key={r.account_id}>
                    <td className="text-muted">{r.code}</td>
                    <td className="fw-semibold">{r.name}</td>
                    <td className="text-end">{formatMoney(dr)}</td>
                    <td className="text-end">{formatMoney(cr)}</td>
                    <td className="text-end">
                      {bal === 0 ? <span className="text-muted">—</span> : `${side} ${formatMoney(bal)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="alert alert-success mt-3">
          <strong>Grand Totals:</strong>
          <span className="ms-3">Debit: {formatMoney(totals.dr)}</span>
          <span className="ms-3">Credit: {formatMoney(totals.cr)}</span>
        </div>

        {/* Pagination */}
        <div className="card-body d-flex justify-content-between">
          <div>Showing {rows.from || 0}-{rows.to || 0} of {rows.total}</div>
          <div className="btn-group">
            {rows.links?.map((l, i) => (
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

      {/* Optional link back */}
      <div className="mt-3">
        <Link href={route('entries.index')} className="btn btn-outline-secondary">
          Back to Entries
        </Link>
      </div>
    </AuthenticatedLayout>
  );
}
