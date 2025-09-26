import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

const fmt = (n) => Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function Approve({ vouchers, filters }) {
  return (
    <AuthenticatedLayout header={<h2 className="m-0">Approve Vouchers</h2>}>
      <Head title="Approve Vouchers" />

      <div className="card mb-3">
        <div className="card-body row g-3">
          <div className="col-md-3">
            <label className="form-label">From</label>
            <input type="date" className="form-control"
              defaultValue={filters?.from || ''}
              onChange={(e)=>window.Inertia.get(route('vouchers.approve'), { ...filters, from: e.target.value }, { preserveState:true })}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">To</label>
            <input type="date" className="form-control"
              defaultValue={filters?.to || ''}
              onChange={(e)=>window.Inertia.get(route('vouchers.approve'), { ...filters, to: e.target.value }, { preserveState:true })}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>JV No.</th>
                <th>Date</th>
                <th>Prepared by</th>
                <th className="text-end">Debit</th>
                <th className="text-end">Credit</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.data.length === 0 && (
                <tr><td colSpan="6" className="text-muted text-center">No submitted vouchers.</td></tr>
              )}
              {vouchers.data.map(v => (
                <tr key={v.id}>
                  <td>{v.jv_number}</td>
                  <td>{v.transaction_date}</td>
                  <td>{v.prepared_by?.name ?? '-'}</td>
                  <td className="text-end">{fmt(v.total_debit)}</td>
                  <td className="text-end">{fmt(v.total_credit)}</td>
                  <td className="text-end">
                    <Link href={route('approve.vouchers.show', v.id)} className="btn btn-sm btn-primary">
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
