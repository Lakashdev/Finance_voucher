import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';

const formatDate = (s) => {
  if (!s) return '-';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s; // fallback if it's already formatted
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kathmandu', // keep dates correct for your locale
  }).format(d); // e.g. "31 Aug 2025"
};

export default function Index({ vouchers, filters }) {
  const { props } = usePage();
  const { data, setData, get } = useForm({
    search: filters?.search || '',
    status: filters?.status || '',
    from:   filters?.from   || '',
    to:     filters?.to     || '',
  });

  const submit = (e) => {
    e.preventDefault();
    get(route('vouchers.index'), { preserveState: true, preserveScroll: true });
  };

  return (
    <AuthenticatedLayout header={<h2 className="m-0">Vouchers</h2>}>
      <Head title="Vouchers" />

      <form onSubmit={submit} className="card mb-3">
        <div className="card-body row g-3">
          <div className="col-md-3">
            <label className="form-label">Search JV No.</label>
            <input className="form-control" value={data.search}
                   onChange={(e)=>setData('search', e.target.value)} placeholder="JV-2025-..." />
          </div>
          <div className="col-md-3">
            <label className="form-label">Status</label>
            <select className="form-select" value={data.status} onChange={(e)=>setData('status', e.target.value)}>
              <option value="">All</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">From</label>
            <input type="date" className="form-control" value={data.from} onChange={(e)=>setData('from', e.target.value)} />
          </div>
          <div className="col-md-3">
            <label className="form-label">To</label>
            <input type="date" className="form-control" value={data.to} onChange={(e)=>setData('to', e.target.value)} />
          </div>
        </div>
        <div className="card-footer">
          <button className="btn btn-primary">Apply filters</button>
          <Link href={route('vouchers.index')} className="btn btn-link">Reset</Link>
        </div>
      </form>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>JV No.</th>
                <th>Transaction Dates</th>
                <th>Status</th>
                <th className="text-end">Debit</th>
                <th className="text-end">Credit</th>
                <th>Prepared by</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vouchers.data.length === 0 && (
                <tr><td colSpan="7" className="text-muted text-center">No vouchers found.</td></tr>
              )}
              {vouchers.data.map(v => (
                <tr key={v.id}>
                  <td>{v.jv_number}</td>
                  <td>{formatDate(v.transaction_date)}</td>
                  <td className="text-capitalize">{v.status}</td>
                  <td className="text-end">{Number(v.total_debit ?? 0).toFixed(2)}</td>
                  <td className="text-end">{Number(v.total_credit ?? 0).toFixed(2)}</td>
                  <td>{v.prepared_by?.name ?? '-'}</td>
                  <td className="text-end">
                    <Link href={route('vouchers.show', v.id)} className="btn btn-sm btn-outline-primary">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="card-footer d-flex justify-content-between">
          <div className="text-muted small">
            Showing {vouchers.from ?? 0}-{vouchers.to ?? 0} of {vouchers.total}
          </div>
          <div>
            {vouchers.links.map((l, i) => (
              <Link key={i} href={l.url || '#'} className={`btn btn-sm ${l.active ? 'btn-primary' : 'btn-outline-secondary'} me-1`} dangerouslySetInnerHTML={{ __html: l.label }} />
            ))}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
