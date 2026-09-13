import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bike,
  Check,
  Clock3,
  Coffee,
  MapPin,
  Minus,
  PackageCheck,
  Pencil,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  Utensils,
  X,
  LockKeyhole,
  LayoutDashboard,
  CircleDot,
} from "lucide-react";
import { supabase } from "./lib/supabase";

const STAFF_EMAIL = "uripachena@yahoo.com";

const seedMenu = [
  {
    id: "m1",
    category: "Small plates",
    name: "Charred aubergine",
    description: "Tahini, smoky tomato, herbs, toasted sesame",
    price: 92,
    image:
      "https://images.unsplash.com/photo-1619096252214-ef06c45683e3?auto=format&fit=crop&w=900&q=85",
    tag: "Plant-based",
  },
  {
    id: "m2",
    category: "Small plates",
    name: "Crispy prawns",
    description: "Citrus mayo, pickled chilli, fresh coriander",
    price: 138,
    image:
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "m3",
    category: "Mains",
    name: "Tua chicken",
    description: "Roast lemon, garlic butter, shoestring potatoes",
    price: 198,
    image:
      "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=900&q=85",
    tag: "House favourite",
  },
  {
    id: "m4",
    category: "Mains",
    name: "Miso-glazed cauliflower",
    description: "Whipped feta, crispy rice, burnt spring onion",
    price: 165,
    image:
      "https://images.unsplash.com/photo-1565299507177-b0ac66763828?auto=format&fit=crop&w=900&q=85",
    tag: "Plant-based",
  },
  {
    id: "m5",
    category: "Mains",
    name: "Grilled linefish",
    description: "Caper beurre blanc, greens, confit potato",
    price: 224,
    image:
      "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "m6",
    category: "To finish",
    name: "Basque cheesecake",
    description: "Burnt top, vanilla cream, macerated berries",
    price: 86,
    image:
      "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "m7",
    category: "To finish",
    name: "Salted caramel pot",
    description: "Dark chocolate, olive oil, flaky sea salt",
    price: 78,
    image:
      "https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "m8",
    category: "Drinks",
    name: "Ginger & lime spritz",
    description: "Fresh ginger, lime, mint, soda",
    price: 54,
    image:
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=85",
    tag: "Zero-proof",
  },
];

const statusSteps = ["Received", "Approved", "Being Prepared", "Ready"];

const deliverySteps = [
  "Received",
  "Approved",
  "Being Prepared",
  "Out for Delivery",
  "Delivered",
];

const money = (value) => `R${value.toLocaleString("en-ZA")}`;

function loadStored(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function orderFromRow(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    items: Array.isArray(row.items) ? row.items : [],
    total: Number(row.total),
    name: row.customer_name,
    phone: row.phone,
    address: row.address || "",
    delivery: row.delivery,
    notes: row.notes || "",
    payment: row.payment_method,
    status: row.status,
  };
}

function orderToRow(order) {
  return {
    id: order.id,
    created_at: order.createdAt,
    customer_name: order.name,
    phone: order.phone,
    address: order.address || null,
    delivery: order.delivery,
    notes: order.notes || null,
    payment_method: order.payment,
    total: order.total,
    status: order.status,
    items: order.items,
    tracking_token: order.trackingToken,
  };
}

function menuFromRow(row) {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    description: row.description || "",
    price: Number(row.price),
    image: row.image || "",
    tag: row.tag || "",
    sortOrder: row.sort_order ?? 0,
  };
}

function menuToRow(item, sortOrder = 0) {
  return {
    id: item.id,
    category: item.category,
    name: item.name,
    description: item.description || "",
    price: Number(item.price),
    image: item.image || null,
    tag: item.tag || null,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  };
}

function App() {
  const [menu, setMenu] = useState(seedMenu);

  // Keep only this customer's own current order in the browser.
  // Staff orders are loaded securely from Supabase after staff authentication.
  const [orders, setOrders] = useState(() => {
    const savedOrder = loadStored("tua-current-order", null);
    return savedOrder ? [savedOrder] : [];
  });

  const [cart, setCart] = useState([]);
  const [view, setView] = useState("home");
  const [category, setCategory] = useState("All");
  const [staffOpen, setStaffOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [trackedId, setTrackedId] = useState(
    () => loadStored("tua-order-tracking", null)?.id || null,
  );
  const [trackingToken, setTrackingToken] = useState(
    () => loadStored("tua-order-tracking", null)?.trackingToken || null,
  );

  // Load the shared menu from Supabase for every visitor and keep it live.
  useEffect(() => {
    if (!supabase) return;

    let active = true;

    const loadMenu = async () => {
      const { data, error } = await supabase
        .from("menu")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) {
        setNotice(`Could not load menu: ${error.message}`);
        return;
      }

      if (active && data) {
        setMenu(data.map(menuFromRow));
      }
    };

    loadMenu();

    const channel = supabase
      .channel("menu-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "menu",
        },
        () => {
          loadMenu();
        },
      )
      .subscribe();

    const handleFocus = () => {
      loadMenu();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      active = false;
      window.removeEventListener("focus", handleFocus);
      supabase.removeChannel(channel);
    };
  }, []);

  // Remove the old browser-only menu cache now that Supabase is the source of truth.
  useEffect(() => {
    localStorage.removeItem("tua-menu");
  }, []);

  // Remove customer order information that older versions
  // of the website may have stored in this browser.
  useEffect(() => {
    localStorage.removeItem("tua-orders");
  }, []);

  // Load ALL restaurant orders only while the staff portal is open.
  useEffect(() => {
    if (!supabase || !staffOpen) return;

    let active = true;

    const loadOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setNotice(`Could not load orders: ${error.message}`);
        return;
      }

      if (active) {
        setOrders((data || []).map(orderFromRow));
      }
    };

    loadOrders();

    const channel = supabase
      .channel("orders-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          if (!active) return;

          if (payload.eventType === "INSERT") {
            setOrders((current) => {
              if (current.some((order) => order.id === payload.new.id)) {
                return current;
              }

              return [orderFromRow(payload.new), ...current];
            });
          }

          if (payload.eventType === "UPDATE") {
            setOrders((current) =>
              current.map((order) =>
                order.id === payload.new.id
                  ? orderFromRow(payload.new)
                  : order,
              ),
            );
          }

          if (payload.eventType === "DELETE") {
            setOrders((current) =>
              current.filter((order) => order.id !== payload.old.id),
            );
          }
        },
      )
      .subscribe();

    const handleFocus = () => {
      loadOrders();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      active = false;
      window.removeEventListener("focus", handleFocus);
      supabase.removeChannel(channel);
    };
  }, [staffOpen]);

  // Customers do not need an account or login.
  // Their browser uses the private tracking token created with the order
  // to check only that order's status every 3 seconds.
  useEffect(() => {
    if (!supabase || !trackedId || !trackingToken) return;

    let active = true;

    const refreshOrderStatus = async () => {
      const { data, error } = await supabase.rpc("get_order_status", {
        p_order_id: trackedId,
        p_tracking_token: trackingToken,
      });

      if (!active || error) return;

      const statusRow = Array.isArray(data) ? data[0] : data;

      if (!statusRow) return;

      setOrders((current) =>
        current.map((order) => {
          if (order.id !== trackedId) {
            return order;
          }

          const updatedOrder = {
            ...order,
            status: statusRow.status,
            createdAt: statusRow.created_at || order.createdAt,
          };

          localStorage.setItem(
            "tua-current-order",
            JSON.stringify(updatedOrder),
          );

          return updatedOrder;
        }),
      );
    };

    refreshOrderStatus();

    const interval = window.setInterval(refreshOrderStatus, 3000);

    window.addEventListener("focus", refreshOrderStatus);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOrderStatus);
    };
  }, [trackedId, trackingToken]);

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => {
      setNotice("");
    }, 2600);

    return () => clearTimeout(timer);
  }, [notice]);

  // Restore the staff session so staff do not have to re-enter the PIN
  // after every new incoming order or a normal page refresh.
  useEffect(() => {
    if (!supabase) return;

    let active = true;

    const restoreStaffSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (
        active &&
        session?.user?.email?.toLowerCase() === STAFF_EMAIL.toLowerCase()
      ) {
        setStaffOpen(true);
      }
    };

    restoreStaffSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (
        session?.user?.email?.toLowerCase() === STAFF_EMAIL.toLowerCase()
      ) {
        setStaffOpen(true);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const categories = ["All", ...new Set(menu.map((item) => item.category))];

  const visibleMenu =
    category === "All"
      ? menu
      : menu.filter((item) => item.category === category);

  const cartCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // A normal customer can only track the order saved in this browser.
  const activeOrder = trackedId
    ? orders.find((order) => order.id === trackedId)
    : null;

  const addToCart = (item) => {
    setCart((current) => {
      const existing = current.find(
        (entry) => entry.id === item.id,
      );

      return existing
        ? current.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  quantity: entry.quantity + 1,
                }
              : entry,
          )
        : [
            ...current,
            {
              ...item,
              quantity: 1,
            },
          ];
    });

    setNotice(`${item.name} added to your order`);
  };

  const updateQuantity = (id, amount) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: item.quantity + amount,
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const placeOrder = async (details) => {
    if (!supabase) {
      setNotice("Could not connect to the ordering system.");
      return;
    }

    const newTrackingToken = crypto.randomUUID();

    const order = {
      id: `TUA-${String(Date.now()).slice(-5)}`,
      createdAt: new Date().toISOString(),
      items: cart,
      total: cartTotal,
      ...details,
      status: "Received",
      trackingToken: newTrackingToken,
    };

    const { error } = await supabase
      .from("orders")
      .insert(orderToRow(order));

    if (error) {
      setNotice(`Could not place order: ${error.message}`);
      return;
    }

    // Store only the information this customer's own browser needs
    // for order tracking. The staff-only customer data remains in Supabase.
    const customerOrder = {
      id: order.id,
      createdAt: order.createdAt,
      items: order.items,
      total: order.total,
      delivery: order.delivery,
      address: order.address || "",
      status: order.status,
    };

    setOrders([customerOrder]);
    setTrackedId(order.id);
    setTrackingToken(newTrackingToken);

    localStorage.setItem(
      "tua-order-tracking",
      JSON.stringify({
        id: order.id,
        trackingToken: newTrackingToken,
      }),
    );

    localStorage.setItem(
      "tua-current-order",
      JSON.stringify(customerOrder),
    );

    setCart([]);
    setView("tracking");
    setNotice("Order received. We are on it.");
  };

  const progressOrder = async (id) => {
    const order = orders.find(
      (entry) => entry.id === id,
    );

    if (!order) return;

    const steps = order.delivery
      ? deliverySteps
      : statusSteps;

    const next =
      steps[
        Math.min(
          steps.indexOf(order.status) + 1,
          steps.length - 1,
        )
      ];

    if (supabase) {
      const { error } = await supabase
        .from("orders")
        .update({
          status: next,
        })
        .eq("id", id);

      if (error) {
        setNotice(`Could not update order: ${error.message}`);
        return;
      }
    }

    setOrders((current) =>
      current.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              status: next,
            }
          : entry,
      ),
    );
  };

  const removeOrder = async (id) => {
    if (supabase) {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", id);

      if (error) {
        setNotice(`Could not delete order: ${error.message}`);
        return;
      }
    }

    setOrders((current) =>
      current.filter((order) => order.id !== id),
    );
  };

  const cancelOrder = async (id) => {
    if (supabase) {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "Cancelled",
        })
        .eq("id", id);

      if (error) {
        setNotice(`Could not cancel order: ${error.message}`);
        return;
      }
    }

    setOrders((current) =>
      current.map((order) =>
        order.id === id
          ? {
              ...order,
              status: "Cancelled",
            }
          : order,
      ),
    );
  };

  const closeStaffPortal = async () => {
    setStaffOpen(false);

    if (supabase) {
      await supabase.auth.signOut();
    }

    // Once staff closes the portal, remove everybody else's
    // orders from the browser memory.
    setOrders((current) => {
      if (!trackedId) {
        return [];
      }

      const trackedOrder = current.find(
        (order) => order.id === trackedId,
      );

      return trackedOrder ? [trackedOrder] : [];
    });
  };

  return (
    <div className="app-shell">
      <Header
        cartCount={cartCount}
        view={view}
        onCart={() => setView("checkout")}
        onStaff={() => setPinOpen(true)}
        onHome={() => setView("home")}
        onMenu={() => setView("menu")}
        onTracking={() =>
          setView(activeOrder ? "tracking" : "menu")
        }
        onContact={() => setView("contact")}
      />

      {view === "home" && (
        <Home
          onExplore={() => {
            setView("menu");

            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }}
          onTrack={() =>
            setView(activeOrder ? "tracking" : "menu")
          }
        />
      )}

      {view === "menu" && (
        <MenuPage
          menu={visibleMenu}
          categories={categories}
          category={category}
          setCategory={setCategory}
          addToCart={addToCart}
          onCart={() => setView("checkout")}
        />
      )}

      {view === "checkout" && (
        <Checkout
          cart={cart}
          total={cartTotal}
          updateQuantity={updateQuantity}
          onBack={() => setView("menu")}
          onPlace={placeOrder}
        />
      )}

      {view === "tracking" && (
        <Tracking
          order={activeOrder}
          onMenu={() => setView("menu")}
        />
      )}

      {view === "contact" && (
        <Contact onMenu={() => setView("menu")} />
      )}

      {pinOpen && (
        <StaffPin
          onClose={() => setPinOpen(false)}
          onUnlock={() => {
            setPinOpen(false);
            setStaffOpen(true);
          }}
        />
      )}

      {staffOpen && (
        <StaffPortal
          menu={menu}
          orders={orders}
          setMenu={setMenu}
          progressOrder={progressOrder}
          removeOrder={removeOrder}
          cancelOrder={cancelOrder}
          setNotice={setNotice}
          close={closeStaffPortal}
        />
      )}

      {notice && (
        <div className="toast">
          <Check size={16} />
          {notice}
        </div>
      )}
    </div>
  );
}

function Header({
  cartCount,
  view,
  onCart,
  onStaff,
  onHome,
  onMenu,
  onTracking,
  onContact,
}) {
  return (
    <header className="site-header">
      <button
        className="wordmark"
        onClick={onHome}
      >
        tua<span>.</span>
      </button>

      <nav>
        <button
          className={view === "home" ? "nav-active" : ""}
          onClick={onHome}
        >
          Our story
        </button>

        <button
          className={view === "menu" ? "nav-active" : ""}
          onClick={onMenu}
        >
          Menu
        </button>

        <button
          className={
            view === "tracking"
              ? "nav-active"
              : ""
          }
          onClick={onTracking}
        >
          Live updates
        </button>

        <button
          className={
            view === "contact"
              ? "nav-active"
              : ""
          }
          onClick={onContact}
        >
          Contact us
        </button>

        <span className="open-status">
          <span />
          Open today · 08:00 to 21:00
        </span>
      </nav>

      <div className="header-actions">
        <button
          className="staff-link"
          onClick={onStaff}
        >
          <LockKeyhole size={14} />
          Staff portal
        </button>

        <button
          className="cart-button"
          onClick={onCart}
        >
          <ShoppingBag size={18} />
          <span>Checkout</span>

          {cartCount > 0 && (
            <b>{cartCount}</b>
          )}
        </button>
      </div>
    </header>
  );
}

function StaffPin({
  onClose,
  onUnlock,
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();

    setError("");

    if (!supabase) {
      setError(
        "Database connection is not available.",
      );
      return;
    }

    if (!pin.trim()) {
      setError("Please enter the staff PIN.");
      return;
    }

    setLoading(true);

    const { error: signInError } =
      await supabase.auth.signInWithPassword({
        email: STAFF_EMAIL,
        password: pin,
      });

    setLoading(false);

    if (signInError) {
      setError(
        "Incorrect staff PIN. Try again.",
      );

      setPin("");
      return;
    }

    onUnlock();
  };

  return (
    <div className="pin-backdrop">
      <form
        className="pin-modal"
        onSubmit={submit}
      >
        <button
          type="button"
          className="icon-button pin-close"
          onClick={onClose}
          aria-label="Close staff access"
        >
          <X size={18} />
        </button>

        <div className="pin-icon">
          <LockKeyhole size={20} />
        </div>

        <p className="eyebrow">
          Tua / Staff access
        </p>

        <h2>
          Unlock the
          <br />
          <em>staff portal.</em>
        </h2>

        <p className="pin-copy">
          Enter the staff PIN to view and
          manage orders.
        </p>

        <label>
          Access PIN

          <input
            autoFocus
            inputMode="numeric"
            type="password"
            value={pin}
            onChange={(event) => {
              setPin(
                event.target.value.replace(
                  /\D/g,
                  "",
                ),
              );

              setError("");
            }}
            placeholder="••••••"
          />
        </label>

        {error && (
          <p className="pin-error">
            {error}
          </p>
        )}

        <button
          className="primary-button wide"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Checking..."
            : "Enter portal"}

          {!loading && (
            <ArrowRight size={16} />
          )}
        </button>
      </form>
    </div>
  );
}

function Home({
  onExplore,
  onTrack,
}) {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="eyebrow-line" />
            A neighbourhood table in the
            heart of the city
          </p>

          <h1>
            Good food.
            <br />
            <em>Good people.</em>
            <br />
            Good times.
          </h1>

          <p className="hero-intro">
            A warm, open-kitchen restaurant
            serving food with a little fire
            in its belly. Come as you are,
            stay for dessert.
          </p>

          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={onExplore}
            >
              Explore the menu
              <ArrowRight size={17} />
            </button>

            <button
              className="text-button"
              onClick={onTrack}
            >
              Track an order
              <CircleDot size={16} />
            </button>
          </div>
        </div>

        <div className="hero-image">
          <img
            src="https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1500&q=90"
            alt="A colourful table of shared dishes at Tua"
          />

          <div className="image-note">
            <span>01</span>

            <div>
              <strong>
                Made for sharing
              </strong>

              <small>
                Seasonal plates, generous
                pours
              </small>
            </div>
          </div>
        </div>
      </section>

      <section className="intro-strip">
        <div className="intro-mark">
          <Sparkles size={18} />
          Est. 2018
        </div>

        <p>
          We believe the best meals are the
          ones that make you forget to check
          your phone.
        </p>

        <div className="strip-detail">
          Kuruman <span>·</span> South Africa
        </div>
      </section>

      <section
        className="featured-section"
        id="menu-anchor"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              From our kitchen
            </p>

            <h2>A few favourites</h2>
          </div>

          <button
            className="text-button"
            onClick={onExplore}
          >
            View full menu
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="featured-grid">
          {seedMenu
            .slice(0, 3)
            .map((item, index) => (
              <article
                className="featured-card"
                key={item.id}
              >
                <div className="featured-image">
                  <img
                    src={item.image}
                    alt={item.name}
                  />

                  <span>
                    0{index + 1}
                  </span>
                </div>

                <div className="featured-meta">
                  <div>
                    <h3>{item.name}</h3>
                    <p>
                      {item.description}
                    </p>
                  </div>

                  <strong>
                    {money(item.price)}
                  </strong>
                </div>
              </article>
            ))}
        </div>
      </section>

      <section className="reservation-band">
        <div>
          <p className="eyebrow">
            Come sit with us
          </p>

          <h2>
            There is always room
            <br />
            <em>at our table.</em>
          </h2>
        </div>

        <div className="reservation-copy">
          <p>
            Find us in Kuruman. Get in touch
            for welding and fabrication
            enquiries, quotations, and
            project details.
          </p>

          <button
            className="outline-button"
            onClick={onExplore}
          >
            Order for collection
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </main>
  );
}

function Contact({
  onMenu,
}) {
  return (
    <main className="contact-page">
      <section className="contact-hero">
        <div>
          <p className="eyebrow">
            Come say hello
          </p>

          <h1>
            Good food is
            <br />
            <em>better together.</em>
          </h1>

          <p className="contact-lede">
            Whether you are joining us for a
            long lunch, collecting dinner,
            or simply have a question, we
            would love to hear from you.
          </p>
        </div>

        <div className="contact-image">
          <img
            src="https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=85"
            alt="Warmly lit tables inside Tua"
          />
        </div>
      </section>

      <section className="contact-details">
        <div>
          <span className="detail-label">
            Find us
          </span>

          <h2>
            TUA Welding and Fabrication
            <br />
            Kuruman, South Africa
          </h2>

          <a
            href="https://maps.google.com/?q=Kuruman+South+Africa"
            target="_blank"
            rel="noreferrer"
          >
            Open in maps
            <ArrowRight size={15} />
          </a>
        </div>

        <div>
          <span className="detail-label">
            Talk to us
          </span>

          <h2>
            +27 83 318 4635
            <br />
            uripachena@yahoo.com
          </h2>

          <p>
            Reg. Number: 2019/139951/07
          </p>

          <p>Fax: 086 414 5988</p>

          <a href="mailto:uripachena@yahoo.com">
            Send an email
            <ArrowRight size={15} />
          </a>
        </div>

        <div>
          <span className="detail-label">
            Opening hours
          </span>

          <h2>
            Monday to Sunday
            <br />
            08:00 to 21:00
          </h2>

          <p>
            Kitchen closes at 21:15
          </p>
        </div>
      </section>

      <section className="contact-footer">
        <div>
          <p className="eyebrow">
            Hungry already?
          </p>

          <h2>
            Let us make
            <br />
            <em>you something.</em>
          </h2>
        </div>

        <button
          className="primary-button"
          onClick={onMenu}
        >
          Order from Tua
          <ArrowRight size={17} />
        </button>
      </section>
    </main>
  );
}

function MenuPage({
  menu,
  categories,
  category,
  setCategory,
  addToCart,
  onCart,
}) {
  return (
    <main className="menu-page">
      <div className="page-intro">
        <p className="eyebrow">
          The good stuff
        </p>

        <h1>
          Eat well,
          <br />
          <em>feel good.</em>
        </h1>

        <p>
          Our menu moves with the seasons,
          but the feeling stays the same:
          generous, considered, and just a
          little bit unexpected.
        </p>
      </div>

      <div className="menu-toolbar">
        <div className="category-tabs">
          {categories.map((item) => (
            <button
              className={
                category === item
                  ? "active"
                  : ""
              }
              onClick={() =>
                setCategory(item)
              }
              key={item}
            >
              {item}
            </button>
          ))}
        </div>

        <button
          className="cart-summary"
          onClick={onCart}
        >
          <ShoppingBag size={16} />
          Checkout <span>→</span>
        </button>
      </div>

      <div className="menu-grid">
        {menu.map((item) => (
          <article
            className="menu-card"
            key={item.id}
          >
            <div className="menu-card-image">
              <img
                src={item.image}
                alt={item.name}
              />

              {item.tag && (
                <span className="dish-tag">
                  {item.tag}
                </span>
              )}

              <button
                className="add-button"
                onClick={() =>
                  addToCart(item)
                }
                aria-label={`Add ${item.name}`}
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="menu-card-copy">
              <div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
              </div>

              <strong>
                {money(item.price)}
              </strong>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

function Checkout({
  cart,
  total,
  updateQuantity,
  onBack,
  onPlace,
}) {
  const [details, setDetails] = useState({
    name: "",
    phone: "",
    address: "",
    delivery: false,
    notes: "",
    payment: "cash",
    cardName: "",
    cardNumber: "",
    cardExpiry: "",
    cardCVV: "",
  });

  const canSubmit =
    details.name.trim() &&
    details.phone.trim() &&
    (!details.delivery ||
      details.address.trim()) &&
    details.payment &&
    (details.payment === "cash" ||
      (details.cardName.trim() &&
        details.cardNumber
          .replace(/\s/g, "")
          .length === 16 &&
        details.cardExpiry.trim() &&
        details.cardCVV.trim()));

  return (
    <main className="checkout-page">
      <button
        className="back-button"
        onClick={onBack}
      >
        ← Back to menu
      </button>

      <div className="checkout-layout">
        <section>
          <p className="eyebrow">
            Almost there
          </p>

          <h1>
            Your order,
            <br />
            <em>your way.</em>
          </h1>

          <div className="fulfilment-toggle">
            <button
              type="button"
              className={
                !details.delivery
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setDetails({
                  ...details,
                  delivery: false,
                })
              }
            >
              <ShoppingBag size={20} />

              <span>
                <b>
                  Pickup / Collection
                </b>

                <small>
                  Ready in about 25 min
                </small>
              </span>

              <Check size={17} />
            </button>

            <button
              type="button"
              className={
                details.delivery
                  ? "selected"
                  : ""
              }
              onClick={() =>
                setDetails({
                  ...details,
                  delivery: true,
                })
              }
            >
              <Bike size={20} />

              <span>
                <b>Deliver my order</b>

                <small>
                  Usually arrives in 45 to
                  60 min
                </small>
              </span>

              <Check size={17} />
            </button>
          </div>

          <form
            className="details-form"
            onSubmit={(event) => {
              event.preventDefault();

              if (canSubmit) {
                onPlace(details);
              }
            }}
          >
            <div className="form-heading">
              <h2>Your details</h2>

              <span>
                We will only use these for
                this order.
              </span>
            </div>

            <label>
              Name

              <input
                required
                value={details.name}
                onChange={(event) =>
                  setDetails({
                    ...details,
                    name: event.target.value,
                  })
                }
                placeholder="Your name"
              />
            </label>

            <label>
              Mobile number

              <input
                required
                value={details.phone}
                onChange={(event) =>
                  setDetails({
                    ...details,
                    phone:
                      event.target.value,
                  })
                }
                placeholder="+27 82 000 0000"
              />
            </label>

            {details.delivery && (
              <label>
                Delivery address

                <input
                  required
                  value={details.address}
                  onChange={(event) =>
                    setDetails({
                      ...details,
                      address:
                        event.target.value,
                    })
                  }
                  placeholder="Street, suburb, Kuruman"
                />
              </label>
            )}

            <label>
              Anything we should know?{" "}
              <span className="optional">
                Optional
              </span>

              <textarea
                value={details.notes}
                onChange={(event) =>
                  setDetails({
                    ...details,
                    notes:
                      event.target.value,
                  })
                }
                placeholder="Allergies, a message, or a good song recommendation..."
              />
            </label>

            <div className="form-heading">
              <h2>Payment method</h2>

              <span>
                Choose how you would like
                to pay.
              </span>
            </div>

            <div className="payment-toggle">
              <button
                type="button"
                className={
                  details.payment ===
                  "cash"
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  setDetails({
                    ...details,
                    payment: "cash",
                  })
                }
              >
                <div className="payment-icon">
                  💵
                </div>

                <span>
                  <b>Cash</b>

                  <small>
                    Pay when you collect or
                    receive
                  </small>
                </span>

                <Check size={17} />
              </button>

              <button
                type="button"
                className={
                  details.payment ===
                  "card"
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  setDetails({
                    ...details,
                    payment: "card",
                  })
                }
              >
                <div className="payment-icon">
                  💳
                </div>

                <span>
                  <b>Card</b>

                  <small>
                    Credit or debit card
                  </small>
                </span>

                <Check size={17} />
              </button>
            </div>

            {details.payment ===
              "card" && (
              <div className="card-details-form">
                <div className="form-heading">
                  <h2>Card details</h2>

                  <span>
                    Your payment information
                    is secure.
                  </span>
                </div>

                <label>
                  Cardholder name

                  <input
                    required
                    value={
                      details.cardName
                    }
                    onChange={(event) =>
                      setDetails({
                        ...details,
                        cardName:
                          event.target.value,
                      })
                    }
                    placeholder="Name on card"
                  />
                </label>

                <label>
                  Card number

                  <input
                    required
                    value={
                      details.cardNumber
                    }
                    onChange={(event) => {
                      const value =
                        event.target.value
                          .replace(
                            /\D/g,
                            "",
                          )
                          .slice(0, 16);

                      const formatted =
                        value
                          .replace(
                            /(\d{4})/g,
                            "$1 ",
                          )
                          .trim();

                      setDetails({
                        ...details,
                        cardNumber:
                          formatted,
                      });
                    }}
                    placeholder="1234 5678 9012 3456"
                    maxLength="19"
                  />
                </label>

                <div className="card-row">
                  <label>
                    Expiry date

                    <input
                      required
                      value={
                        details.cardExpiry
                      }
                      onChange={(
                        event,
                      ) => {
                        let value =
                          event.target.value
                            .replace(
                              /\D/g,
                              "",
                            )
                            .slice(0, 4);

                        if (
                          value.length >= 2
                        ) {
                          value =
                            value.slice(
                              0,
                              2,
                            ) +
                            "/" +
                            value.slice(2);
                        }

                        setDetails({
                          ...details,
                          cardExpiry:
                            value,
                        });
                      }}
                      placeholder="MM/YY"
                      maxLength="5"
                    />
                  </label>

                  <label>
                    CVV

                    <input
                      required
                      value={
                        details.cardCVV
                      }
                      onChange={(
                        event,
                      ) => {
                        const value =
                          event.target.value
                            .replace(
                              /\D/g,
                              "",
                            )
                            .slice(0, 3);

                        setDetails({
                          ...details,
                          cardCVV:
                            value,
                        });
                      }}
                      placeholder="123"
                      maxLength="3"
                    />
                  </label>
                </div>
              </div>
            )}

            <button
              className="primary-button wide"
              disabled={!canSubmit}
            >
              Place order
              <ArrowRight size={17} />
            </button>
          </form>
        </section>

        <aside className="order-summary">
          <div className="summary-top">
            <h2>Your order</h2>

            <span>
              {cart.reduce(
                (sum, item) =>
                  sum + item.quantity,
                0,
              )}{" "}
              items
            </span>
          </div>

          {cart.length === 0 ? (
            <div className="empty-cart">
              <ShoppingBag size={28} />

              <p>
                Your order is empty.
              </p>

              <button
                className="text-button"
                onClick={onBack}
              >
                Browse the menu
                <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <>
              {cart.map((item) => (
                <div
                  className="summary-item"
                  key={item.id}
                >
                  <img
                    src={item.image}
                    alt=""
                  />

                  <div>
                    <b>{item.name}</b>

                    <span>
                      {money(
                        item.price *
                          item.quantity,
                      )}
                    </span>

                    <div className="quantity">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            -1,
                          )
                        }
                      >
                        <Minus
                          size={13}
                        />
                      </button>

                      <span>
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            1,
                          )
                        }
                      >
                        <Plus
                          size={13}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="total-row">
                <span>Subtotal</span>

                <strong>
                  {money(total)}
                </strong>
              </div>

              <div className="total-row muted">
                <span>
                  {details.delivery
                    ? "Delivery"
                    : "Collection"}
                </span>

                <span>
                  {details.delivery
                    ? "Calculated at checkout"
                    : "Free"}
                </span>
              </div>

              <div className="total-row grand">
                <span>Total</span>

                <strong>
                  {money(total)}
                </strong>
              </div>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}

function Tracking({
  order,
  onMenu,
}) {
  if (!order) {
    return (
      <main className="tracking-page no-order">
        <PackageCheck size={42} />

        <p className="eyebrow">
          Nothing to see yet
        </p>

        <h1>
          Your next great meal
          <br />
          <em>starts here.</em>
        </h1>

        <button
          className="primary-button"
          onClick={onMenu}
        >
          Browse the menu
          <ArrowRight size={17} />
        </button>
      </main>
    );
  }

  const steps = order.delivery
    ? deliverySteps
    : statusSteps;

  const currentIndex =
    steps.indexOf(order.status);

  return (
    <main className="tracking-page">
      <div className="tracking-header">
        <div>
          <p className="eyebrow">
            Order {order.id}
          </p>

          <h1>
            We have it.
            <br />
            <em>We are on it.</em>
          </h1>
        </div>

        <span className="live-pill">
          <span />
          Live updates
        </span>
      </div>

      <div className="tracking-card">
        <div className="tracking-card-top">
          <div>
            <span className="status-kicker">
              Current status
            </span>

            <h2>{order.status}</h2>

            <p>
              {order.status === "Received"
                ? "Your order has landed safely in our kitchen."
                : order.status === "Approved"
                  ? "Your order has been approved and is waiting for the kitchen."
                  : order.status === "Being Prepared"
                    ? "Our kitchen is making your order with care."
                    : order.status === "Ready"
                      ? "Come on in, your order is ready."
                      : order.status === "Out for Delivery"
                        ? "Your order is on its way to you."
                        : order.status === "Delivered"
                          ? "Your order has been delivered. Enjoy every bite."
                          : order.status === "Cancelled"
                            ? "This order has been cancelled."
                            : "We are keeping you updated."}
            </p>
          </div>

          {order.delivery ? (
            <Bike size={32} />
          ) : (
            <Utensils size={32} />
          )}
        </div>

        <div className="progress-track">
          {steps.map(
            (step, index) => (
              <div
                className={`progress-step ${
                  index <= currentIndex
                    ? "done"
                    : ""
                } ${
                  index === currentIndex
                    ? "current"
                    : ""
                }`}
                key={step}
              >
                <span>
                  {index <
                  currentIndex ? (
                    <Check
                      size={13}
                    />
                  ) : (
                    index + 1
                  )}
                </span>

                <small>
                  {step}
                </small>
              </div>
            ),
          )}
        </div>

        <div className="tracking-footer">
          <span>
            <Clock3 size={16} />

            {order.status ===
              "Delivered" ||
            order.status === "Ready"
              ? " Ready now"
              : order.delivery
                ? " Arriving in 45 to 60 min"
                : " Ready in about 25 min"}
          </span>

          <span>
            <MapPin size={16} />

            {order.delivery
              ? ` ${order.address}`
              : " TUA, Kuruman"}
          </span>
        </div>
      </div>

      <div className="tracking-order-list">
        <div>
          <h2>Order details</h2>

          <span>
            {new Date(
              order.createdAt,
            ).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {order.items.map((item) => (
          <div
            className="tracking-item"
            key={item.id}
          >
            <span>
              {item.quantity} ×{" "}
              {item.name}
            </span>

            <strong>
              {money(
                item.price *
                  item.quantity,
              )}
            </strong>
          </div>
        ))}

        <div className="tracking-total">
          <span>Total</span>

          <strong>
            {money(order.total)}
          </strong>
        </div>
      </div>
    </main>
  );
}

function StaffPortal({
  menu,
  orders,
  setMenu,
  progressOrder,
  removeOrder,
  cancelOrder,
  setNotice,
  close,
}) {
  const [tab, setTab] =
    useState("orders");

  const [editing, setEditing] =
    useState(null);

  const [form, setForm] = useState({
    name: "",
    category: "Mains",
    description: "",
    price: "",
    image: seedMenu[0].image,
    tag: "",
  });

  const resetForm = () => {
    setEditing(null);
    setForm({
      name: "",
      category: "Mains",
      description: "",
      price: "",
      image: seedMenu[0].image,
      tag: "",
    });
  };

  const saveItem = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.price) {
      setNotice("Please enter a dish name and price.");
      return;
    }

    if (!supabase) {
      setNotice("Could not connect to the menu database.");
      return;
    }

    const item = {
      ...form,
      id: editing?.id || `m${Date.now()}`,
      name: form.name.trim(),
      description: form.description.trim(),
      image: form.image.trim(),
      tag: form.tag.trim(),
      price: Number(form.price),
    };

    if (editing) {
      const existingIndex = menu.findIndex((entry) => entry.id === editing.id);
      const sortOrder = existingIndex >= 0
        ? (menu[existingIndex].sortOrder ?? existingIndex + 1)
        : menu.length + 1;

      const { error } = await supabase
        .from("menu")
        .update(menuToRow(item, sortOrder))
        .eq("id", editing.id);

      if (error) {
        setNotice(`Could not update menu item: ${error.message}`);
        return;
      }

      setMenu((current) =>
        current.map((entry) =>
          entry.id === editing.id
            ? { ...item, sortOrder }
            : entry,
        ),
      );

      setNotice("Menu item updated.");
    } else {
      const sortOrder =
        menu.reduce(
          (highest, entry) => Math.max(highest, entry.sortOrder || 0),
          0,
        ) + 1;

      const newItem = { ...item, sortOrder };

      const { error } = await supabase
        .from("menu")
        .insert(menuToRow(newItem, sortOrder));

      if (error) {
        setNotice(`Could not add menu item: ${error.message}`);
        return;
      }

      setMenu((current) => [...current, newItem]);
      setNotice("Menu item added.");
    }

    resetForm();
  };

  const editItem = (item) => {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      description: item.description || "",
      price: String(item.price),
      image: item.image || "",
      tag: item.tag || "",
    });
  };

  const deleteMenuItem = async (id) => {
    if (!supabase) {
      setNotice("Could not connect to the menu database.");
      return;
    }

    const { error } = await supabase
      .from("menu")
      .delete()
      .eq("id", id);

    if (error) {
      setNotice(`Could not remove menu item: ${error.message}`);
      return;
    }

    setMenu((current) => current.filter((item) => item.id !== id));

    if (editing?.id === id) {
      resetForm();
    }

    setNotice("Menu item removed.");
  };

  const activeOrders =
    orders.filter(
      (order) =>
        ![
          "Delivered",
          "Ready",
          "Cancelled",
        ].includes(order.status),
    );

  const today =
    new Date().toDateString();

  const todaysOrders =
    orders.filter(
      (order) =>
        new Date(
          order.createdAt,
        ).toDateString() === today,
    );

  const revenue =
    todaysOrders
      .filter(
        (order) =>
          order.status !==
          "Cancelled",
      )
      .reduce(
        (sum, order) =>
          sum + order.total,
        0,
      );

  const pending =
    todaysOrders.filter(
      (order) =>
        order.status === "Received",
    ).length;

  const approved =
    todaysOrders.filter(
      (order) =>
        [
          "Approved",
          "Being Prepared",
          "Ready",
          "Out for Delivery",
          "Delivered",
        ].includes(order.status),
    ).length;

  const cancelled =
    todaysOrders.filter(
      (order) =>
        order.status === "Cancelled",
    ).length;

  return (
    <div className="portal-backdrop">
      <section className="staff-portal">
        <header className="portal-header">
          <div>
            <p className="eyebrow">
              Tua / Staff
            </p>

            <h2>
              Good morning, team.
            </h2>
          </div>

          <button
            className="icon-button"
            onClick={close}
            aria-label="Close staff portal"
          >
            <X size={20} />
          </button>
        </header>

        <div className="portal-tabs">
          <button
            className={
              tab === "orders"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("orders")
            }
          >
            <LayoutDashboard
              size={16}
            />
            Live orders
            <b>
              {activeOrders.length}
            </b>
          </button>

          <button
            className={
              tab === "menu"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("menu")
            }
          >
            <Utensils size={16} />
            Menu management
          </button>
        </div>

        <StaffStats
          revenue={revenue}
          pending={pending}
          approved={approved}
          cancelled={cancelled}
        />

        {tab === "orders" ? (
          <OrderMonitor
            orders={orders}
            progressOrder={
              progressOrder
            }
            removeOrder={
              removeOrder
            }
            cancelOrder={
              cancelOrder
            }
          />
        ) : (
          <MenuManager
            menu={menu}
            form={form}
            setForm={setForm}
            editing={editing}
            setEditing={setEditing}
            saveItem={saveItem}
            editItem={editItem}
            deleteMenuItem={deleteMenuItem}
            resetForm={resetForm}
          />
        )}
      </section>
    </div>
  );
}

function StaffStats({
  revenue,
  pending,
  approved,
  cancelled,
}) {
  return (
    <div className="staff-stats">
      <div className="stat-card stat-revenue">
        <span>
          Today's revenue
        </span>

        <strong>
          {money(revenue)}
        </strong>

        <small>
          Excluding cancelled
        </small>
      </div>

      <div className="stat-card">
        <span>Pending</span>

        <strong>{pending}</strong>

        <small>
          Awaiting approval
        </small>
      </div>

      <div className="stat-card">
        <span>Approved</span>

        <strong>{approved}</strong>

        <small>
          In service today
        </small>
      </div>

      <div className="stat-card stat-cancelled">
        <span>Cancelled</span>

        <strong>
          {cancelled}
        </strong>

        <small>
          Today's orders
        </small>
      </div>
    </div>
  );
}

function OrderMonitor({
  orders,
  progressOrder,
  removeOrder,
  cancelOrder,
}) {
  return (
    <div className="monitor">
      <div className="monitor-heading">
        <div>
          <h3>Service pulse</h3>

          <p>
            Move orders forward as the
            kitchen works.
          </p>
        </div>

        <span className="live-pill">
          <span />
          Syncing live
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="staff-empty">
          <Coffee size={28} />

          <h3>No orders yet</h3>

          <p>
            New customer orders will
            appear here.
          </p>
        </div>
      ) : (
        <div className="order-list">
          {orders.map((order) => {
            const steps =
              order.delivery
                ? deliverySteps
                : statusSteps;

            const isFinal =
              order.status ===
                steps[
                  steps.length - 1
                ] ||
              order.status ===
                "Cancelled";

            return (
              <article
                className="staff-order"
                key={order.id}
              >
                <div className="staff-order-top">
                  <div>
                    <span className="order-id">
                      {order.id}
                    </span>

                    <h3>
                      {order.name}

                      <span className="order-time">
                        {" "}
                        ·{" "}
                        {new Date(
                          order.createdAt,
                        ).toLocaleTimeString(
                          [],
                          {
                            hour:
                              "2-digit",
                            minute:
                              "2-digit",
                          },
                        )}
                      </span>
                    </h3>
                  </div>

                  <span
                    className={`order-status status-${order.status
                      .toLowerCase()
                      .replaceAll(
                        " ",
                        "-",
                      )}`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="staff-order-body">
                  <div className="staff-items">
                    {order.items.map(
                      (item) => (
                        <span
                          key={item.id}
                        >
                          <b>
                            {
                              item.quantity
                            }
                            ×
                          </b>{" "}
                          {item.name}
                        </span>
                      ),
                    )}
                  </div>

                  <div className="customer-detail">
                    <span>
                      {order.delivery ? (
                        <Bike
                          size={15}
                        />
                      ) : (
                        <ShoppingBag
                          size={15}
                        />
                      )}{" "}
                      {order.delivery
                        ? "Delivery"
                        : "Collection"}
                    </span>

                    <span>
                      <MapPin
                        size={15}
                      />{" "}
                      {order.delivery
                        ? order.address
                        : "At restaurant"}
                    </span>

                    <span>
                      <b>
                        {money(
                          order.total,
                        )}
                      </b>{" "}
                      · {order.phone}
                    </span>
                  </div>
                </div>

                <div className="staff-order-actions">
                  {!isFinal && (
                    <button
                      className="primary-button small"
                      onClick={() =>
                        progressOrder(
                          order.id,
                        )
                      }
                    >
                      {order.status ===
                      "Received"
                        ? "Approve order"
                        : order.status ===
                            "Approved"
                          ? "Start preparing"
                          : order.delivery
                            ? order.status ===
                              "Being Prepared"
                              ? "Mark out for delivery"
                              : "Mark delivered"
                            : "Mark ready"}

                      <ArrowRight
                        size={15}
                      />
                    </button>
                  )}

                  {isFinal && (
                    <span className="completed-label">
                      <Check
                        size={15}
                      />

                      {order.status ===
                      "Cancelled"
                        ? "Cancelled"
                        : "Complete"}
                    </span>
                  )}

                  {!isFinal && (
                    <button
                      className="cancel-button"
                      onClick={() =>
                        cancelOrder(
                          order.id,
                        )
                      }
                    >
                      Cancel order
                    </button>
                  )}

                  <button
                    className="delete-button"
                    onClick={() =>
                      removeOrder(
                        order.id,
                      )
                    }
                  >
                    <Trash2 size={15} />
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MenuManager({
  menu,
  form,
  setForm,
  editing,
  saveItem,
  editItem,
  deleteMenuItem,
  resetForm,
}) {
  return (
    <div className="menu-manager">
      <div className="monitor-heading">
        <div>
          <h3>
            Menu management
          </h3>

          <p>
            Changes are saved to Supabase and update the customer menu across devices.
          </p>
        </div>
      </div>

      <form
        className="menu-form"
        onSubmit={saveItem}
      >
        <div className="form-heading">
          <h2>
            {editing
              ? "Edit dish"
              : "Add a dish"}
          </h2>

          {editing && (
            <button
              type="button"
              className="text-button"
              onClick={resetForm}
            >
              Cancel
            </button>
          )}
        </div>

        <div className="form-grid">
          <label>
            Dish name

            <input
              value={form.name}
              onChange={(event) =>
                setForm({
                  ...form,
                  name:
                    event.target.value,
                })
              }
              placeholder="e.g. Spring vegetable tart"
            />
          </label>

          <label>
            Price (R)

            <input
              type="number"
              value={form.price}
              onChange={(event) =>
                setForm({
                  ...form,
                  price:
                    event.target.value,
                })
              }
              placeholder="145"
            />
          </label>

          <label>
            Category

            <select
              value={form.category}
              onChange={(event) =>
                setForm({
                  ...form,
                  category:
                    event.target.value,
                })
              }
            >
              <option>
                Small plates
              </option>
              <option>Mains</option>
              <option>
                To finish
              </option>
              <option>Drinks</option>
            </select>
          </label>

          <label>
            Tag{" "}
            <span className="optional">
              Optional
            </span>

            <input
              value={form.tag}
              onChange={(event) =>
                setForm({
                  ...form,
                  tag:
                    event.target.value,
                })
              }
              placeholder="House favourite"
            />
          </label>
        </div>

        <label>
          Description

          <textarea
            value={form.description}
            onChange={(event) =>
              setForm({
                ...form,
                description:
                  event.target.value,
              })
            }
            placeholder="A short, delicious description..."
          />
        </label>

        <label>
          Image URL

          <input
            value={form.image}
            onChange={(event) =>
              setForm({
                ...form,
                image:
                  event.target.value,
              })
            }
          />
        </label>

        <button
          className="primary-button small"
          type="submit"
        >
          {editing
            ? "Save changes"
            : "Add to menu"}

          <Check size={15} />
        </button>
      </form>

      <div className="managed-list">
        {menu.map((item) => (
          <div
            className="managed-item"
            key={item.id}
          >
            <img
              src={item.image}
              alt=""
            />

            <div>
              <b>{item.name}</b>

              <span>
                {item.category} ·{" "}
                {money(item.price)}
              </span>
            </div>

            <div className="managed-item-actions">
              <button
                className="icon-button"
                onClick={() => editItem(item)}
                aria-label={`Edit ${item.name}`}
              >
                <Pencil size={16} />
              </button>

              <button
                className="icon-button delete-button"
                onClick={() => deleteMenuItem(item.id)}
                aria-label={`Delete ${item.name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;