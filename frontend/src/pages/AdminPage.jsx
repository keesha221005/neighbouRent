import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = "http://localhost:5000/api";

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, emoji }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

// ── Login Gate ────────────────────────────────────────────────────────────────
function AdminLogin({ onSuccess }) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setChecking(true);
    setError("");
    try {
      // Use the stats endpoint as a way to validate the secret
      await axios.get(`${API_BASE}/users/admin/stats`, {
        headers: { "x-admin-secret": secret },
      });
      onSuccess(secret);
    } catch (err) {
      setError("Incorrect admin key. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-sm shadow-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔐</div>
          <h1 className="text-xl font-bold text-gray-900">Admin Access</h1>
          <p className="text-sm text-gray-500 mt-1">Enter the admin key to continue</p>
        </div>

        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Admin secret key"
          autoFocus
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
        />

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <button type="submit" disabled={checking || !secret}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl text-sm disabled:opacity-50">
          {checking ? "Verifying..." : "Enter Dashboard"}
        </button>
      </form>
    </div>
  );
}

// ── Main Admin Dashboard ─────────────────────────────────────────────────────
export default function AdminPage() {
  const [adminSecret, setAdminSecret] = useState(null); // stays in memory only, never localStorage
  const [tab, setTab] = useState("verifications");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const headers = { "x-admin-secret": adminSecret };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, verifyRes, bookingsRes] = await Promise.all([
        axios.get(`${API_BASE}/users/admin/stats`, { headers }),
        axios.get(`${API_BASE}/users/admin/all`, { headers }),
        axios.get(`${API_BASE}/users/pending-verifications`, { headers }),
        axios.get(`${API_BASE}/users/admin/bookings`, { headers }),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setPendingVerifications(verifyRes.data);
      setBookings(bookingsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminSecret) fetchAll();
  }, [adminSecret]);

  const handleVerifyAction = async (userId, action) => {
    setActionLoading(userId);
    try {
      await axios.patch(`${API_BASE}/users/${userId}/verify`, { action }, { headers });
      await fetchAll();
    } catch (err) {
      alert("Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  if (!adminSecret) {
    return <AdminLogin onSuccess={setAdminSecret} />;
  }

  const tabs = [
    { id: "verifications", label: "ID Verifications", count: pendingVerifications.length },
    { id: "users", label: "All Users", count: users.length },
    { id: "bookings", label: "Bookings", count: bookings.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">NeighbouRent platform overview</p>
          </div>
          <button onClick={() => setAdminSecret(null)}
            className="text-sm text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
            Sign out
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <StatCard label="Total Users" value={stats.totalUsers} emoji="👥" />
            <StatCard label="Total Items" value={stats.totalItems} emoji="📦" />
            <StatCard label="Total Bookings" value={stats.totalBookings} emoji="📅" />
            <StatCard label="Pending IDs" value={stats.pendingVerifications} emoji="⏳" />
            <StatCard label="CO₂ Saved" value={`${stats.totalCO2Saved.toFixed(1)} kg`} emoji="🌱" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors relative ${
                tab === t.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}>
              {t.label}
              {t.count > 0 && (
                <span className="ml-1.5 bg-indigo-600 text-white text-xs px-1.5 py-0.5 rounded-full">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white border border-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* ── ID Verifications Tab ── */}
            {tab === "verifications" && (
              <div className="space-y-3">
                {pendingVerifications.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
                    <div className="text-4xl mb-2">✅</div>
                    <p className="font-medium text-gray-600">No pending verifications</p>
                  </div>
                ) : pendingVerifications.map(u => (
                  <div key={u.id} className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4 items-center">
                    {u.idDocument && (
                      <a href={u.idDocument} target="_blank" rel="noreferrer">
                        <img src={u.idDocument} alt="ID document" className="w-20 h-20 rounded-lg object-cover border border-gray-200" />
                      </a>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                      <span className="inline-block mt-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full capitalize">
                        {u.idType}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerifyAction(u.id, "approve")}
                        disabled={actionLoading === u.id}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50">
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleVerifyAction(u.id, "reject")}
                        disabled={actionLoading === u.id}
                        className="text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg font-medium disabled:opacity-50">
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── All Users Tab ── */}
            {tab === "users" && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Name</th>
                      <th className="text-left px-4 py-3 font-medium">Email</th>
                      <th className="text-left px-4 py-3 font-medium">Email ✓</th>
                      <th className="text-left px-4 py-3 font-medium">ID Status</th>
                      <th className="text-left px-4 py-3 font-medium">Items</th>
                      <th className="text-left px-4 py-3 font-medium">Bookings</th>
                      <th className="text-left px-4 py-3 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                        <td className="px-4 py-3 text-gray-500">{u.email}</td>
                        <td className="px-4 py-3">
                          {u.emailVerified
                            ? <span className="text-green-600">✓</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            u.idStatus === "verified" ? "bg-green-50 text-green-700"
                            : u.idStatus === "pending" ? "bg-yellow-50 text-yellow-700"
                            : u.idStatus === "rejected" ? "bg-red-50 text-red-600"
                            : "bg-gray-50 text-gray-400"
                          }`}>
                            {u.idStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{u._count.items}</td>
                        <td className="px-4 py-3 text-gray-500">{u._count.bookings}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(u.createdAt).toLocaleDateString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Bookings Tab ── */}
            {tab === "bookings" && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Item</th>
                      <th className="text-left px-4 py-3 font-medium">Renter</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium">Dates</th>
                      <th className="text-left px-4 py-3 font-medium">Total</th>
                      <th className="text-left px-4 py-3 font-medium">CO₂</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bookings.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{b.item?.title}</td>
                        <td className="px-4 py-3 text-gray-500">{b.renter?.name}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(b.startDate).toLocaleDateString("en-IN")} → {new Date(b.endDate).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-indigo-600 font-medium">₹{b.totalPrice}</td>
                        <td className="px-4 py-3 text-green-600">{b.co2Saved > 0 ? `${b.co2Saved} kg` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}