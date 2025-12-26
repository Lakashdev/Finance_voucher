import { Link, usePage } from '@inertiajs/react';

export default function AuthenticatedLayout({ header, children }) {
  const { auth, flash } = usePage().props || {};
  const user = auth?.user;

  // Prefer Ziggy route-name checks; fall back to exact path if route() isn't available.
  const url = usePage().url || '';
  const isRoute = (...namesOrExactPaths) => {
    try {
      // route().current accepts a string or array of names
      return route().current(namesOrExactPaths);
    } catch {
      // Fallback: treat inputs as exact paths like '/vouchers'
      return namesOrExactPaths.some(p => p && typeof p === 'string' && url === p);
    }
  };

  return (
    <div className="min-vh-100 bg-light">
      {/* Top Navbar */}
      <nav className="navbar navbar-dark bg-dark sticky-top">
        <div className="container-fluid">
          <button
            className="btn btn-outline-light d-lg-none me-2"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#appSidebar"
            aria-controls="appSidebar"
          >
            ☰
          </button>

          <Link href={route('dashboard')} className="navbar-brand">Finance</Link>

          <div className="ms-auto d-flex align-items-center gap-3">
            <span className="navbar-text text-white small">
              {user?.name} {user?.role ? `(${user.role})` : ''}
            </span>
            <Link href={route('logout')} method="post" as="button" className="btn btn-outline-light btn-sm">
              Logout
            </Link>
          </div>
        </div>
      </nav>

      <div className="container-fluid">
        <div className="row">
          {/* Sidebar (desktop) */}
          <aside className="col-lg-3 col-xl-2 d-none d-lg-block border-end bg-white min-vh-100 p-0">
            <nav className="list-group list-group-flush py-2">
              <Link
                href={route('dashboard')}
                className={`list-group-item list-group-item-action ${isRoute('dashboard') ? 'active' : ''}`}
              >
                🏠 Dashboard
              </Link>

              <Link
                href={route('vouchers.create')}
                className={`list-group-item list-group-item-action ${isRoute('vouchers.create') ? 'active' : ''}`}
              >
                ➕ Add Voucher
              </Link>

              {/* Mark View Vouchers active for index (and optionally show) */}
              <Link
                href={route('vouchers.index')}
                className={`list-group-item list-group-item-action ${isRoute('vouchers.index', 'vouchers.show') ? 'active' : ''}`}
              >
                📄 View Vouchers
              </Link>
              <Link
                href={route('entries.index')}
                className={`list-group-item list-group-item-action ${ (usePage().url || '') === '/entries' ? 'active' : '' }`}
                >
                🧾 Ledger Book
            </Link>

              {/* {user?.role === 'accountant' && ( */}
                <Link
                  href={route('vouchers.rejected')}
                  className={`list-group-item list-group-item-action ${isRoute('vouchers.rejected') ? 'active' : ''}`}
                >
                  ❌ Rejected Vouchers
                </Link>
             {/*  )} */}

              {user?.role === 'supervisor' && (
                <>
                  <Link
                    href={route('vouchers.approve')}
                    className={`list-group-item list-group-item-action ${isRoute('vouchers.approve') ? 'active' : ''}`}
                  >
                    ✅ Approve Vouchers
                  </Link>

                  <Link
                    href={route('users.index')}
                    className={`list-group-item list-group-item-action ${isRoute('users.index') ? 'active' : ''}`}
                  >
                    👥 User Management
                  </Link>

                  {/* <Link
                    href={route('users.index', { create: 1 })}
                    className="list-group-item list-group-item-action"
                  >
                    ➕ Add User
                  </Link> */}
                  <Link
                    href={route('accounts.index')}
                    className={`list-group-item list-group-item-action ${route().current('accounts.index') ? 'active' : ''}`}
                    >
                    📚 Acount Header
                    </Link>
                    <Link>

                    </Link>
                </>
              )}
            </nav>
          </aside>

          {/* Sidebar (mobile offcanvas) */}
          <div className="offcanvas offcanvas-start d-lg-none" tabIndex="-1" id="appSidebar" aria-labelledby="appSidebarLabel">
            <div className="offcanvas-header">
              <h5 className="offcanvas-title" id="appSidebarLabel">Menu</h5>
              <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div className="offcanvas-body p-0">
              <nav className="list-group list-group-flush">
                <Link href={route('dashboard')} className="list-group-item list-group-item-action" data-bs-dismiss="offcanvas">
                  🏠 Dashboard
                </Link>
                <Link href={route('vouchers.create')} className="list-group-item list-group-item-action" data-bs-dismiss="offcanvas">
                  ➕ Add Voucher
                </Link>
                <Link href={route('vouchers.index')} className="list-group-item list-group-item-action" data-bs-dismiss="offcanvas">
                  📄 View Vouchers
                </Link>

                {user?.role === 'accountant' && (
                  <Link href={route('vouchers.rejected')} className="list-group-item list-group-item-action" data-bs-dismiss="offcanvas">
                    ❌ Rejected Vouchers
                  </Link>
                )}

                {user?.role === 'supervisor' && (
                  <>

                    <Link href={route('vouchers.approve')} className="list-group-item list-group-item-action" data-bs-dismiss="offcanvas">
                      ✅ Approve Vouchers
                    </Link>
                    <Link href={route('users.index')} className="list-group-item list-group-item-action" data-bs-dismiss="offcanvas">
                      👥 User Management
                    </Link>
{/*                     <Link href={route('users.index', { create: 1 })} className="list-group-item list-group-item-action" data-bs-dismiss="offcanvas">
                      ➕ Add User
                    </Link> */}

                    <Link
                    href={route('accounts.index')}
                    className={`list-group-item list-group-item-action ${route().current('accounts.index') ? 'active' : ''}`}
                    >
                    📚 Acount Header
                    </Link>

                  </>
                )}
              </nav>
            </div>
          </div>

          {/* Main content */}
          <main className="col-lg-9 col-xl-10 py-3">
            {header && <div className="mb-3">{header}</div>}
            {flash?.success && <div className="alert alert-success">{flash.success}</div>}
            {flash?.error && <div className="alert alert-danger">{flash.error}</div>}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
