import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const VERIFICATION_THRESHOLD = 500;

function StarRating({ rating, size = "text-sm" }) {
  return (
    <span className={`flex gap-0.5 ${size}`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? "text-[var(--color-coral)]" : "text-gray-200"}>★</span>
      ))}
    </span>
  );
}

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [booking, setBooking] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [showBookingSheet, setShowBookingSheet] = useState(false);

  const [emailVerified, setEmailVerified] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await api.get(`/items/${id}`);
        setItem(res.data);
      } catch {
        navigate("/listings");
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id, navigate]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchVerification = async () => {
      setVerifyLoading(true);
      try {
        const res = await api.get("/auth/me");
        setEmailVerified(res.data.emailVerified || false);
      } catch { /* ignore */ } finally {
        setVerifyLoading(false);
      }
    };
    fetchVerification();
  }, [isLoggedIn]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 animate-pulse space-y-4">
        <div className="h-80 bg-gray-100 rounded-3xl" />
        <div className="h-6 bg-gray-100 rounded w-1/2" />
        <div className="h-4 bg-gray-100 rounded w-1/3" />
      </div>
    );
  }

  if (!item) return null;

  const bookedRanges = item.bookings || [];

  const days =
    startDate && endDate
      ? Math.max(0, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)))
      : 0;
  const totalRent = days * item.pricePerDay;
  const totalWithDeposit = totalRent + item.deposit;

  const requiresVerification = item.pricePerDay >= VERIFICATION_THRESHOLD;
  const verificationBlocked = requiresVerification && isLoggedIn && !emailVerified;

  const handleBook = async () => {
    if (!isLoggedIn) { navigate("/login"); return; }
    if (verificationBlocked) return;
    if (!startDate || !endDate || days <= 0) return;

    setBookingLoading(true);
    setBookingError("");

    try {
      const { data } = await api.post("/bookings", {
        itemId: item.id, startDate, endDate,
        totalPrice: totalWithDeposit, deposit: item.deposit,
      });
      navigate("/checkout", {
        state: { bookingId: data.id, itemTitle: item.title, totalPrice: totalWithDeposit },
      });
    } catch (err) {
      setBookingError(err.response?.data?.error || "Booking failed. Please try again.");
    } finally {
      setBookingLoading(false);
    }
  };

  const isOwner = user?.id === item.owner?.id;
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-28 lg:pb-8">
      <Link to="/listings" className="text-sm text-gray-400 hover:text-[var(--color-violet)] font-semibold flex items-center gap-1 mb-5 transition-colors">
        ← Back to browsing
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-7">

          {/* Images */}
          <div>
            <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-[var(--color-violet-light)] to-amber-50 h-80 relative">
              {item.images?.length > 0 ? (
                <img
                  src={item.images?.[activeImage] || item.images?.[0] || "/placeholder.png"}
                  alt={item.title}
                  onError={(e) => { e.target.onerror = null; e.target.src = "/placeholder.png"; }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">📦</div>
              )}
              {/* Category floating badge */}
              <span className="absolute top-3 left-3 bg-white/95 backdrop-blur text-xs font-bold px-3 py-1.5 rounded-full font-display shadow-sm">
                {item.category}
              </span>
            </div>
            {item.images?.length > 1 && (
              <div className="flex gap-2 mt-3">
                {item.images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${activeImage === i ? "border-[var(--color-violet)]" : "border-transparent opacity-60"}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title and info */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                {requiresVerification && (
                  <span className="inline-block text-xs font-bold bg-[var(--color-coral-light)] text-[var(--color-coral)] px-2.5 py-1 rounded-full mb-2">
                    🔒 ID required to book
                  </span>
                )}
                <h1 className="font-display text-2xl font-extrabold text-[var(--color-ink)] leading-tight">{item.title}</h1>
                <p className="text-gray-400 text-sm mt-1.5">📍 {item.address}</p>
              </div>
              {item.avgRating && (
                <div className="text-right flex-shrink-0 bg-[var(--color-fresh-light)] rounded-2xl px-3 py-2">
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-[var(--color-fresh)] font-bold">★</span>
                    <span className="font-display font-bold text-[var(--color-ink)]">{item.avgRating}</span>
                  </div>
                  <span className="text-[11px] text-gray-400">{item.reviewCount} review{item.reviewCount !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="font-mono-price">
                <span className="text-3xl font-bold text-[var(--color-ink)]">₹{item.pricePerDay}</span>
                <span className="text-gray-400 text-sm">/day</span>
              </div>
              {item.deposit > 0 && (
                <div className="text-xs font-semibold text-[var(--color-violet)] bg-[var(--color-violet-light)] px-3 py-1.5 rounded-full">
                  +₹{item.deposit} deposit
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h2 className="font-display font-bold text-[var(--color-ink)] mb-2">About this item</h2>
            <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
          </div>

          {/* Owner */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--color-violet)] rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
              {item.owner?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-[var(--color-ink)]">{item.owner?.name}</span>
                {item.owner?.verified && (
                  <span className="text-xs font-semibold bg-[var(--color-fresh-light)] text-[var(--color-fresh)] px-2 py-0.5 rounded-full">✓ Verified</span>
                )}
              </div>
              <p className="text-sm text-gray-400">
                Member since {new Date(item.owner?.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long" })}
              </p>
            </div>
          </div>

          {/* Map */}
          <div>
            <h2 className="font-display font-bold text-[var(--color-ink)] mb-3">Pickup location</h2>
            <div className="rounded-2xl overflow-hidden border border-gray-100" style={{ height: "240px" }}>
              <MapContainer center={[item.latitude, item.longitude]} zoom={15} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[item.latitude, item.longitude]} />
              </MapContainer>
            </div>
          </div>

          {/* Reviews */}
          {item.reviews?.length > 0 && (
            <div>
              <h2 className="font-display font-bold text-[var(--color-ink)] mb-4">Reviews</h2>
              <div className="space-y-4">
                {item.reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-[var(--color-violet-light)] rounded-full flex items-center justify-center text-xs font-bold text-[var(--color-violet)]">
                        {review.user?.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-[var(--color-ink)]">{review.user?.name}</span>
                        <div className="flex items-center gap-1.5">
                          <StarRating rating={review.rating} size="text-xs" />
                          <span className="text-xs text-gray-300">{new Date(review.createdAt).toLocaleDateString("en-IN")}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 ml-11">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — Booking box (desktop only, sticky) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm sticky top-24">
            <BookingBoxContent
              booking={booking} isOwner={isOwner} isLoggedIn={isLoggedIn}
              verificationBlocked={verificationBlocked} verifyLoading={verifyLoading}
              startDate={startDate} endDate={endDate} today={today}
              setStartDate={setStartDate} setEndDate={setEndDate}
              days={days} totalRent={totalRent} totalWithDeposit={totalWithDeposit}
              item={item} bookingError={bookingError} bookingLoading={bookingLoading}
              handleBook={handleBook} bookedRanges={bookedRanges}
            />
          </div>
        </div>
      </div>

      {/* ── Mobile floating booking bar (signature element) ── */}
      {!isOwner && !booking && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-40">
          <div className="font-mono-price">
            <span className="text-xl font-bold text-[var(--color-ink)]">₹{item.pricePerDay}</span>
            <span className="text-gray-400 text-xs">/day</span>
          </div>
          <button
            onClick={() => setShowBookingSheet(true)}
            className="btn-bounce ml-auto bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-display font-bold px-8 py-3.5 rounded-2xl text-sm shadow-md"
          >
            {verificationBlocked ? "View details" : "Book now"}
          </button>
        </div>
      )}

      {/* Mobile bottom sheet */}
      {showBookingSheet && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBookingSheet(false)} />
          <div className="relative bg-white rounded-t-3xl w-full max-h-[85vh] overflow-y-auto p-5 pb-8 animate-[slideUp_0.25s_ease-out]">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <BookingBoxContent
              booking={booking} isOwner={isOwner} isLoggedIn={isLoggedIn}
              verificationBlocked={verificationBlocked} verifyLoading={verifyLoading}
              startDate={startDate} endDate={endDate} today={today}
              setStartDate={setStartDate} setEndDate={setEndDate}
              days={days} totalRent={totalRent} totalWithDeposit={totalWithDeposit}
              item={item} bookingError={bookingError} bookingLoading={bookingLoading}
              handleBook={handleBook} bookedRanges={bookedRanges}
            />
          </div>
        </div>
      )}

      {/* Show confirmation / owner state on mobile too, inline */}
      {(booking || isOwner) && (
        <div className="lg:hidden mt-6 bg-white border border-gray-100 rounded-3xl p-5">
          <BookingBoxContent
            booking={booking} isOwner={isOwner} isLoggedIn={isLoggedIn}
            verificationBlocked={verificationBlocked} verifyLoading={verifyLoading}
            startDate={startDate} endDate={endDate} today={today}
            setStartDate={setStartDate} setEndDate={setEndDate}
            days={days} totalRent={totalRent} totalWithDeposit={totalWithDeposit}
            item={item} bookingError={bookingError} bookingLoading={bookingLoading}
            handleBook={handleBook} bookedRanges={bookedRanges}
          />
        </div>
      )}
    </div>
  );
}

// ── Shared booking box content (used in sidebar + bottom sheet) ────────────
function BookingBoxContent({
  booking, isOwner, isLoggedIn, verificationBlocked, verifyLoading,
  startDate, endDate, today, setStartDate, setEndDate,
  days, totalRent, totalWithDeposit, item, bookingError, bookingLoading,
  handleBook, bookedRanges,
}) {
  if (booking) {
    return (
      <div className="text-center py-4">
        <div className="text-4xl mb-3">🎉</div>
        <h3 className="font-display font-bold text-[var(--color-ink)] text-lg">Booking Requested!</h3>
        <p className="text-sm text-gray-400 mt-2">Your booking is pending confirmation from the owner.</p>
        <div className="bg-[var(--color-bg)] rounded-2xl p-4 mt-4 text-left text-sm space-y-2">
          <div className="flex justify-between"><span className="text-gray-400">From</span><span className="font-semibold">{new Date(startDate).toLocaleDateString("en-IN")}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">To</span><span className="font-semibold">{new Date(endDate).toLocaleDateString("en-IN")}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Days</span><span className="font-semibold">{days}</span></div>
          <div className="flex justify-between font-bold text-[var(--color-ink)] border-t border-gray-200 pt-2 font-mono-price"><span>Total Paid</span><span>₹{totalWithDeposit}</span></div>
        </div>
        <Link to="/dashboard" className="block mt-4 text-sm text-[var(--color-violet)] font-bold hover:underline">View in Dashboard →</Link>
      </div>
    );
  }

  if (isOwner) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-400 text-sm">This is your listing.</p>
        <Link to="/dashboard" className="block mt-3 text-[var(--color-violet)] font-bold text-sm hover:underline">Manage from Dashboard →</Link>
      </div>
    );
  }

  return (
    <>
      <h3 className="font-display font-bold text-[var(--color-ink)] text-lg mb-4">Book this item</h3>

      {verificationBlocked && !verifyLoading && (
        <div className="mb-4 bg-[var(--color-coral-light)] rounded-2xl p-4">
          <p className="text-sm font-bold text-[var(--color-coral)] mb-1">📧 Email Verification Required</p>
          <p className="text-xs text-[var(--color-coral)]/80 mb-3">
            Items above ₹500/day require a verified email before booking. This takes less than a minute.
          </p>
          <Link to="/profile" className="inline-block text-xs bg-[var(--color-coral)] hover:opacity-90 text-white px-4 py-2 rounded-xl font-bold transition-opacity">
            Verify my email →
          </Link>
        </div>
      )}

      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Start Date</label>
          <input type="date" value={startDate} min={today} disabled={verificationBlocked}
            onChange={(e) => { setStartDate(e.target.value); setEndDate(""); }}
            className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--color-violet)] disabled:bg-gray-50 disabled:text-gray-300 transition-colors" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">End Date</label>
          <input type="date" value={endDate} min={startDate || today} disabled={verificationBlocked}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--color-violet)] disabled:bg-gray-50 disabled:text-gray-300 transition-colors" />
        </div>
      </div>

      {days > 0 && (
        <div className="bg-[var(--color-bg)] rounded-2xl p-4 mb-4 text-sm space-y-2 font-mono-price">
          <div className="flex justify-between text-gray-500">
            <span className="font-sans">₹{item.pricePerDay} × {days} day{days !== 1 ? "s" : ""}</span>
            <span>₹{totalRent}</span>
          </div>
          {item.deposit > 0 && (
            <div className="flex justify-between text-gray-500">
              <span className="font-sans">Refundable deposit</span>
              <span>₹{item.deposit}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-[var(--color-ink)] border-t border-gray-200 pt-2">
            <span className="font-sans">Total</span>
            <span>₹{totalWithDeposit}</span>
          </div>
        </div>
      )}

      {bookingError && (
        <div className="bg-[var(--color-coral-light)] text-[var(--color-coral)] text-xs px-3 py-2.5 rounded-xl mb-3 font-semibold">
          {bookingError}
        </div>
      )}

      <button
        onClick={handleBook}
        disabled={verificationBlocked || !startDate || !endDate || days <= 0 || bookingLoading}
        className="btn-bounce w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:bg-gray-100 disabled:text-gray-300 text-white font-display font-bold py-3.5 rounded-2xl transition-colors text-sm"
      >
        {bookingLoading
          ? "Processing..."
          : verificationBlocked
          ? "Email Verification Required"
          : isLoggedIn
          ? days > 0 ? `Book for ₹${totalWithDeposit}` : "Select dates"
          : "Login to Book"}
      </button>

      {bookedRanges.length > 0 && (
        <div className="mt-3 text-xs text-gray-300 text-center font-medium">
          Some dates may be unavailable — check with the owner
        </div>
      )}
    </>
  );
}