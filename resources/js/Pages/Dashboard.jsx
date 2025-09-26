import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';

export default function Dashboard() {
    const { props } = usePage();
    const auth = props?.auth;
    const success = props?.flash?.success;
    const error   = props?.flash?.error;


  return (
    <AuthenticatedLayout user={auth.user}>
      <Head title="Dashboard" />
      {/* Flash messages */}
      {success && <div className="alert alert-success mb-3">{success}</div>}
      {error   && <div className="alert alert-danger  mb-3">{error}</div>}



      <div className="row g-3">
        {/* Add Voucher */}
        <div className="col-sm-6 col-lg-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body d-flex flex-column">
              <h5 className="card-title">Add Voucher</h5>
              <p className="text-muted flex-grow-1">
                Create a new journal voucher with debit/credit lines.
              </p>
              <Link href={route('vouchers.create')} className="btn btn-primary mt-auto">
                Add a voucher
              </Link>
            </div>
          </div>
        </div>

        {/* Approve Voucher (Supervisor only) */}
        {auth.user.role === 'supervisor' && (
          <div className="col-sm-6 col-lg-4">
            <div className="card h-100 shadow-sm">
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">Approve Vouchers</h5>
                <p className="text-muted flex-grow-1">
                  Review and approve submitted vouchers.
                </p>
                <Link href={route('vouchers.approve')} className="btn btn-success mt-auto">
                  Go to approvals
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* View Vouchers */}
        <div className="col-sm-6 col-lg-4">
          <div className="card h-100 shadow-sm">
            <div className="card-body d-flex flex-column">
              <h5 className="card-title">View Vouchers</h5>
              <p className="text-muted flex-grow-1">
                Browse all vouchers with filters and totals.
              </p>
              <Link href={route('vouchers.index')} className="btn btn-outline-primary mt-auto">
                View vouchers
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
