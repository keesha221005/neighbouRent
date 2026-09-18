import { useState, useEffect } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const STATUS_STYLES = {
  pending:   { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400" },
  confirmed: { bg: "bg-[var(--color-violet-light)]", text: "text-[var(--color-violet)]", dot: "bg-[var(--color-violet)]" },
  active:    { bg: "bg-[var(--color-fresh-light)]", text: "text-[var(--color-fresh)]", dot: "bg-[var(--color-fresh)]" },
  completed: { bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400" },
  rejected:  { bg: "bg-[var(--color-coral-light)]", text: "text-[var(--color-coral)]", dot: "bg-[var(--color-coral)]" },
  cancelled: { bg: "bg-[var(--color-coral-light)]", text: "text-[var(--color-coral)]", dot: "bg-[var(--color-coral)]" },
};

// ── Review Modal ────────────────────────────────────────────────────────────
function ReviewModal({ booking, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (rating === 0) return setError("Please select a star rating.");
    setSubmitting(true);
    setError("");
    try {
      await api.post("/reviews", { itemId: booking.item.id, rating, comment });
      onSubmitted();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-3xl shadow-xl p-6 w-full max-w-md">
        <h2 className="font-display text-lg font-bold text-[var(--color-ink)] mb-1">Leave a Review</h2>
        <p className="text-sm text-gray-400 mb-4">{booking.item?.title}</p>

        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)} onMouseLeave={() => setHovered(0)}
              className="text-3xl transition-transform hover:scale-110">
              <span className={(hovered || rating) >= star ? "text-[var(--color-coral)]" : "text-gray-200"}>★</span>
            </button>
          ))}
        </div>

        <textarea
          value={comment} onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience (optional)" rows={3}
          className="w-full border-2 border-gray-100 rounded-2xl px-3.5 py-2.5 text-sm text-[var(--color-ink)] resize-none focus:outline-none focus:border-[var(--color-violet)] mb-3 transition-colors"
        />

        {error && <p className="text-xs text-[var(--color-coral)] font-semibold mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose}
            className="btn-bounce text-sm font-bold px-4 py-2.5 rounded-xl border-2 border-gray-100 text-gray-500 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="btn-bounce text-sm font-bold bg-[var(--color-violet)] hover:bg-[var(--color-primary-dark)] text-white px-5 py-2.5 rounded-xl disabled:opacity-50">
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status Pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.completed;
  return (
    <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

// ── Booking Card ────────────────────────────────────────────────────────────
function BookingCard({ booking, isOwner, onStatusChange, onReview }) {
  const item = booking.item;
  const other = isOwner ? booking.renter : item?.owner;
  const [updating, setUpdating] = useState(false);

  const handleStatus = async (status) => {
    setUpdating(true);
    try {
      await api.patch(`/bookings/${booking.id}/status`, { status });
      onStatusChange();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="card-lift bg-white border border-gray-100 rounded-2xl p-4 flex gap-4">
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-[var(--color-violet-light)] flex-shrink-0">
        {item?.images?.[0] ? (
          <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link to={`/items/${item?.id}`} className="font-display font-bold text-[var(--color-ink)] hover:text-[var(--color-violet)] text-sm transition-colors">
              {item?.title}
            </Link>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">
              {isOwner ? `Renter: ${other?.name}` : `Owner: ${other?.name}`}
            </p>
          </div>
          <StatusPill status={booking.status} />
        </div>

        <div className="flex gap-4 mt-2 text-xs text-gray-400 font-medium">
          <span>📅 {new Date(booking.startDate).toLocaleDateString("en-IN")} → {new Date(booking.endDate).toLocaleDateString("en-IN")}</span>
          <span className="font-mono-price font-bold text-[var(--color-ink)]">₹{booking.totalPrice}</span>
          {booking.deposit > 0 && <span className="text-gray-300">+₹{booking.deposit} deposit</span>}
        </div>

        {/* CO₂ + money saved badges */}
        {booking.status === "completed" && (booking.co2Saved > 0 || booking.moneySaved > 0) && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {booking.co2Saved > 0 && (
              <span className="text-xs font-bold bg-[var(--color-fresh-light)] text-[var(--color-fresh)] px-2.5 py-1 rounded-full">
                🌱 {booking.co2Saved} kg CO₂ saved
              </span>
            )}
            {booking.moneySaved > 0 && (
              <span className="text-xs font-bold bg-[var(--color-violet-light)] text-[var(--color-violet)] px-2.5 py-1 rounded-full">
                💰 ₹{booking.moneySaved} saved vs buying new
              </span>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-3 flex-wrap">
          {/* OWNER actions */}
          {isOwner && booking.status === "pending" && (
            <>
              <button onClick={() => handleStatus("confirmed")} disabled={updating}
                className="btn-bounce text-xs font-bold bg-[var(--color-fresh)] hover:opacity-90 text-white px-3.5 py-2 rounded-xl disabled:opacity-50">
                ✓ Confirm
              </button>
              <button onClick={() => handleStatus("rejected")} disabled={updating}
                className="btn-bounce text-xs font-bold bg-[var(--color-coral-light)] hover:bg-[var(--color-coral)] hover:text-white text-[var(--color-coral)] px-3.5 py-2 rounded-xl disabled:opacity-50 transition-colors">
                ✕ Reject
              </button>
            </>
          )}
          {isOwner && booking.status === "confirmed" && (
            <button onClick={() => handleStatus("active")} disabled={updating}
              className="btn-bounce text-xs font-bold bg-[var(--color-violet)] hover:bg-[var(--color-primary-dark)] text-white px-3.5 py-2 rounded-xl disabled:opacity-50">
              Mark as Active
            </button>
          )}
          {isOwner && booking.status === "active" && (
            <button onClick={() => handleStatus("completed")} disabled={updating}
              className="btn-bounce text-xs font-bold bg-[var(--color-ink)] hover:opacity-90 text-white px-3.5 py-2 rounded-xl disabled:opacity-50">
              Mark Completed
            </button>
          )}

          {/* RENTER actions */}
          {!isOwner && ["pending", "confirmed"].includes(booking.status) && (
            <button onClick={() => handleStatus("cancelled")} disabled={updating}
              className="btn-bounce text-xs font-bold bg-[var(--color-coral-light)] hover:bg-[var(--color-coral)] hover:text-white text-[var(--color-coral)] px-3.5 py-2 rounded-xl disabled:opacity-50 transition-colors">
              Cancel Booking
            </button>
          )}
          {!isOwner && booking.status === "active" && (
            <button onClick={() => handleStatus("completed")} disabled={updating}
              className="btn-bounce text-xs font-bold bg-[var(--color-violet)] hover:bg-[var(--color-primary-dark)] text-white px-3.5 py-2 rounded-xl disabled:opacity-50">
              Mark as Returned
            </button>
          )}
          {!isOwner && booking.status === "completed" && !booking.reviewed && (
            <button onClick={() => onReview(booking)}
              className="btn-bounce text-xs font-bold bg-[var(--color-coral)] hover:opacity-90 text-white px-3.5 py-2 rounded-xl">
              ★ Leave a Review
            </button>
          )}
          {!isOwner && booking.status === "completed" && booking.reviewed && (
            <span className="text-xs text-gray-300 font-semibold italic px-2 py-2">✓ Reviewed</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Item Manage Card ────────────────────────────────────────────────────────
function ItemManageCard({ item, onToggle, onDelete }) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      await api.patch(`/items/${item.id}`, { available: !item.available });
      onToggle();
    } catch { } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this listing permanently?")) return;
    try {
      await api.delete(`/items/${item.id}`);
      onDelete();
    } catch (err) {
      alert(err.response?.data?.error || "Could not delete");
    }
  };

  return (
    <div className="card-lift bg-white border border-gray-100 rounded-2xl p-4 flex gap-4">
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-[var(--color-violet-light)] flex-shrink-0">
        {item.images?.[0] ? (
          <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <Link to={`/items/${item.id}`} className="font-display font-bold text-[var(--color-ink)] hover:text-[var(--color-violet)] text-sm transition-colors">
              {item.title}
            </Link>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">{item.category} · ₹{item.pricePerDay}/day</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${item.available ? "bg-[var(--color-fresh-light)] text-[var(--color-fresh)]" : "bg-gray-100 text-gray-400"}`}>
            {item.available ? "Listed" : "Hidden"}
          </span>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleToggle} disabled={loading}
            className="btn-bounce text-xs font-bold bg-[var(--color-violet-light)] hover:bg-[var(--color-violet)] hover:text-white text-[var(--color-violet)] px-3.5 py-2 rounded-xl disabled:opacity-50 transition-colors">
            {loading ? "..." : item.available ? "Hide Listing" : "Make Available"}
          </button>
          <button onClick={handleDelete}
            className="btn-bounce text-xs font-bold bg-[var(--color-coral-light)] hover:bg-[var(--color-coral)] hover:text-white text-[var(--color-coral)] px-3.5 py-2 rounded-xl transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Page ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("my-bookings");
  const [myBookings, setMyBookings] = useState([]);
  const [ownerBookings, setOwnerBookings] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [b1, b2, items] = await Promise.all([
        api.get("/bookings/my"),
        api.get("/bookings/owner"),
        api.get("/items/my"),
      ]);
      setMyBookings(b1.data);
      setOwnerBookings(b2.data);
      setMyItems(items.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const completedBookings = myBookings.filter(b => b.status === "completed");
  const totalCO2Saved = completedBookings.reduce((sum, b) => sum + (b.co2Saved || 0), 0).toFixed(2);
  const totalMoneySaved = completedBookings.reduce((sum, b) => sum + (b.moneySaved || 0), 0).toFixed(0);

  const tabs = [
    { id: "my-bookings", label: "My Rentals", count: myBookings.length },
    { id: "owner-bookings", label: "Booking Requests", count: ownerBookings.filter(b => b.status === "pending").length },
    { id: "my-items", label: "My Listings", count: myItems.length },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-7">

      {reviewTarget && (
        <ReviewModal booking={reviewTarget} onClose={() => setReviewTarget(null)} onSubmitted={fetchAll} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[var(--color-ink)]">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-medium">Welcome back, {user?.name}</p>
        </div>
        <Link to="/list-item"
          className="btn-bounce bg-[var(--color-violet)] hover:bg-[var(--color-primary-dark)] text-white font-display font-bold text-sm px-4 py-2.5 rounded-xl transition-colors">
          + List an Item
        </Link>
      </div>

      {/* Stats — 5 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Items Listed",     value: myItems.length, emoji: "📦", accent: "bg-[var(--color-violet-light)]" },
          { label: "Active Rentals",   value: myBookings.filter(b => ["confirmed","active"].includes(b.status)).length, emoji: "🔑", accent: "bg-[var(--color-fresh-light)]" },
          { label: "Pending Requests", value: ownerBookings.filter(b => b.status === "pending").length, emoji: "⏳", accent: "bg-amber-50" },
          { label: "CO₂ Saved",       value: `${totalCO2Saved} kg`, emoji: "🌱", accent: "bg-[var(--color-fresh-light)]" },
          { label: "Money Saved",      value: `₹${totalMoneySaved}`, emoji: "💰", accent: "bg-[var(--color-coral-light)]" },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
            <div className={`w-9 h-9 ${stat.accent} rounded-xl flex items-center justify-center text-lg mx-auto mb-2`}>
              {stat.emoji}
            </div>
            <div className="font-display text-lg font-extrabold text-[var(--color-ink)]">{stat.value}</div>
            <div className="text-[11px] text-gray-400 mt-0.5 font-semibold">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1.5 mb-5">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`btn-bounce flex-1 py-2.5 text-sm font-display font-bold rounded-xl transition-colors relative ${tab === t.id ? "bg-[var(--color-ink)] text-white" : "text-gray-400 hover:text-[var(--color-ink)]"}`}>
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? "bg-white/20" : "bg-[var(--color-coral)] text-white"}`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-white border border-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {tab === "my-bookings" && (
            <div className="space-y-3">
              {myBookings.length === 0 ? (
                <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
                  <div className="text-4xl mb-3">🛒</div>
                  <p className="font-display font-bold text-[var(--color-ink)]">No rentals yet</p>
                  <Link to="/listings" className="text-[var(--color-violet)] text-sm font-bold hover:underline mt-1 block">Browse items to rent →</Link>
                </div>
              ) : (
                <>
                  {myBookings.map(b => (
                    <BookingCard key={b.id} booking={b} isOwner={false} onStatusChange={fetchAll} onReview={setReviewTarget} />
                  ))}

                  {completedBookings.some(b => b.co2Saved > 0 || b.moneySaved > 0) && (
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {totalCO2Saved > 0 && (
                        <div className="bg-[var(--color-fresh-light)] rounded-2xl p-4">
                          <p className="text-sm font-display font-bold text-[var(--color-fresh)] mb-1">🌱 Your environmental impact</p>
                          <p className="text-xs text-[var(--color-fresh)]/80 font-medium">
                            By renting instead of buying, you've avoided <strong>{totalCO2Saved} kg</strong> of CO₂ emissions — roughly equivalent to planting <strong>{Math.max(1, Math.round(totalCO2Saved / 21))} tree{Math.round(totalCO2Saved / 21) !== 1 ? "s" : ""}</strong>.
                          </p>
                        </div>
                      )}
                      {totalMoneySaved > 0 && (
                        <div className="bg-[var(--color-violet-light)] rounded-2xl p-4">
                          <p className="text-sm font-display font-bold text-[var(--color-violet)] mb-1">💰 Your money saved</p>
                          <p className="text-xs text-[var(--color-violet)]/80 font-medium">
                            You've saved <strong>₹{totalMoneySaved}</strong> by renting instead of buying these items new.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "owner-bookings" && (
            <div className="space-y-3">
              {ownerBookings.length === 0 ? (
                <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
                  <div className="text-4xl mb-3">📬</div>
                  <p className="font-display font-bold text-[var(--color-ink)]">No booking requests yet</p>
                </div>
              ) : ownerBookings.map(b => (
                <BookingCard key={b.id} booking={b} isOwner={true} onStatusChange={fetchAll} onReview={setReviewTarget} />
              ))}
            </div>
          )}

          {tab === "my-items" && (
            <div className="space-y-3">
              {myItems.length === 0 ? (
                <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
                  <div className="text-4xl mb-3">📦</div>
                  <p className="font-display font-bold text-[var(--color-ink)]">You haven't listed anything yet</p>
                  <Link to="/list-item" className="text-[var(--color-violet)] text-sm font-bold hover:underline mt-1 block">List your first item →</Link>
                </div>
              ) : myItems.map(item => (
                <ItemManageCard key={item.id} item={item} onToggle={fetchAll} onDelete={fetchAll} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}