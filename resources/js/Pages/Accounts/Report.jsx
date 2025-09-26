import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage, Link } from '@inertiajs/react';

const monthOpts = [
  { v: 1, t: 'Jan' }, { v: 2, t: 'Feb' }, { v: 3, t: 'Mar' },
  { v: 4, t: 'Apr' }, { v: 5, t: 'May' }, { v: 6, t: 'Jun' },
  { v: 7, t: 'Jul' }, { v: 8, t: 'Aug' }, { v: 9, t: 'Sep' },
  { v: 10, t: 'Oct' }, { v: 11, t: 'Nov' }, { v: 12, t: 'Dec' },
];

const fmtMoney = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Report() {
  const { props } = usePage();
  const { account, filters, years, totals } = props;

  const onChange = (name, value) => {
    const q = {
      year:  name === 'year'  ? Number(value) : Number(filters.year),
      month: name === 'month' ? Number(value) : Number(filters.month),
    };
    router.get(route('accounts.report', account.id), q, { preserveState: true, replace: true });
  };

  return (
    <AuthenticatedLayout header={<h4 className="m-0">Account Report — {account.code} · {account.name}</h4>}>
      <Head title={`Account Report - ${account.name}`} />

      {/* Filters */}
      <div className="d-flex justify-content-between align-items-end mb-3">
        <div className="d-flex gap-2">
          <div>
            <label className="form-label mb-1">Year</label>
            <select className="form-select" value={filters.year} onChange={(e)=>onChange('year', e.target.value)}>
              {years.length === 0 && <option value="">—</option>}
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label mb-1">Month</label>
            <select className="form-select" value={filters.month} onChange={(e)=>onChange('month', e.target.value)}>
              {monthOpts.map(m => <option key={m.v} value={m.v}>{m.t}</option>)}
            </select>
          </div>
        </div>
        <div className="text-muted">Period: <strong>{filters.periodLabel}</strong></div>
      </div>

      {/* Month total */}
      <div className="row g-3">
        <div className="col-md-4">
          <div className="card border-success">
            <div className="card-body">
              <div className="text-muted">Debit (month)</div>
              <div className="h4 mb-0">{fmtMoney(totals.debit_sum)}</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-primary">
            <div className="card-body">
              <div className="text-muted">Credit (month)</div>
              <div className="h4 mb-0">{fmtMoney(totals.credit_sum)}</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className={`card ${Number(totals.net) >= 0 ? 'border-success' : 'border-danger'}`}>
            <div className="card-body">
              <div className="text-muted">Net (Dr − Cr)</div>
              <div className="h4 mb-0">{fmtMoney(totals.net)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <Link href={route('accounts.index')} className="btn btn-outline-secondary">Back to Accounts</Link>
      </div>
    </AuthenticatedLayout>
  );
}
