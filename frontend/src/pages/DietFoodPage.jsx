import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useAuth } from "../utils/AuthProvider";
import "./GymPlansPage.css";
import "./DietFoodPage.css";

const emptyForm = {
  name: "",
  description: "",
  dietType: "Balanced",
  dailyCalories: "",
  breakfastPlan: "",
  lunchPlan: "",
  dinnerPlan: "",
  snacksPlan: "",
  restrictions: "",
  userId: "",
  trainerId: "",
  active: true,
};

const getErrorMessage = (err, fallbackMessage) => {
  const responseData = err?.response?.data;

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData;
  }

  if (responseData && typeof responseData === "object") {
    if (typeof responseData.message === "string" && responseData.message.trim()) {
      return responseData.message;
    }

    if (typeof responseData.error === "string" && responseData.error.trim()) {
      return responseData.error;
    }
  }

  if (typeof err?.message === "string" && err.message.trim()) {
    return err.message;
  }

  return fallbackMessage;
};

const resolvePerson = (person, fallbackId, fallbackLabel) => {
  const id = person?.id ?? fallbackId ?? "N/A";
  const name = person?.fullName || person?.username || `${fallbackLabel} ${id}`;
  const email = person?.email || "";

  return { id, name, email };
};

const DietFoodPage = () => {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === "ADMIN";
  const isTrainer = role === "TRAINER";
  const isClient = role === "CLIENT";

  const [form, setForm] = useState(emptyForm);
  const [plans, setPlans] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookedPlanOptions, setBookedPlanOptions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const authConfig = useMemo(() => {
    const token = localStorage.getItem("token");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm({
      ...emptyForm,
      trainerId: isTrainer ? user?.id ?? "" : "",
    });
    setError("");
    setSuccess("");
  };

  const loadOptions = async () => {
    try {
      const usersResponse = await api.get("/api/auth/users", authConfig);

      setUsers(Array.isArray(usersResponse?.data) ? usersResponse.data : []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load user options."));
    }
  };

  const loadPlans = async () => {
    setIsLoading(true);
    setError("");

    try {
      let response;

      if (isClient && user?.id) {
        response = await api.get(`/api/diet/user/${user.id}`);
      } else if (isTrainer && user?.id) {
        response = await api.get(`/api/diet/trainer/${user.id}`);
      } else {
        response = await api.get("/api/diet");
      }

      const data = response?.data;

      if (Array.isArray(data)) {
        setPlans(data);
      } else if (data) {
        setPlans([data]);
      } else {
        setPlans([]);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load diet plans."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    resetForm();
    loadOptions();
    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    const loadBookedPlansForClient = async () => {
      if (!form.userId) {
        setBookedPlanOptions([]);
        return;
      }

      try {
        const response = await api.get(`/api/bookings/user/${form.userId}`, authConfig);
        const bookings = Array.isArray(response?.data) ? response.data : [];
        const uniquePlans = [];
        const seenPlanIds = new Set();

        bookings.forEach((booking) => {
          const bookedPlan = booking?.plan;
          if (!bookedPlan?.id || seenPlanIds.has(bookedPlan.id)) return;
          seenPlanIds.add(bookedPlan.id);
          uniquePlans.push(bookedPlan);
        });

        setBookedPlanOptions(uniquePlans);
      } catch (err) {
        setBookedPlanOptions([]);
        setError(getErrorMessage(err, "Failed to load booked plans for the selected client."));
      }
    };

    loadBookedPlansForClient();
  }, [authConfig, form.userId]);

  useEffect(() => {
    if (!form.name) return;

    const selectedPlanStillExists = bookedPlanOptions.some((planOption) => planOption.name === form.name);
    if (!selectedPlanStillExists) {
      setForm((current) => ({ ...current, name: "" }));
    }
  }, [bookedPlanOptions, form.name]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isAdmin && !isTrainer) {
      setError("Only admin or trainer can create diet plans.");
      return;
    }

    if (!form.userId) {
      setError("Client ID is required.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      dietType: form.dietType.trim(),
      dailyCalories: Number(form.dailyCalories),
      breakfastPlan: form.breakfastPlan.trim(),
      lunchPlan: form.lunchPlan.trim(),
      dinnerPlan: form.dinnerPlan.trim(),
      snacksPlan: form.snacksPlan.trim(),
      restrictions: form.restrictions.trim(),
      active: Boolean(form.active),
    };

    const params = new URLSearchParams();
    params.append("userId", form.userId);

    if (isTrainer && user?.id) {
      params.append("trainerId", user.id);
    } else if (isAdmin && form.trainerId) {
      params.append("trainerId", form.trainerId);
    } else if (isAdmin) {
      setError("Trainer ID is required when creating as admin.");
      setIsSaving(false);
      return;
    }

    try {
      await api.post(`/api/diet?${params.toString()}`, payload, authConfig);
      setSuccess("Diet plan created successfully.");
      resetForm();
      loadPlans();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create diet plan."));
    } finally {
      setIsSaving(false);
    }
  };

  const pageIntro = isClient
    ? "See the nutrition plan assigned to you, including meal timing, calories, trainer details, and special restrictions."
    : "Create and review diet plans with a clear view of trainer ownership. Client details will appear here when the API includes them.";

  const plansSubtitle = isClient ? "Plans assigned to you" : "Plans you can access";
  const clientOptions = users.filter((currentUser) => currentUser.role === "CLIENT" && currentUser.active !== false);
  const trainerOptions = users.filter((currentUser) => currentUser.role === "TRAINER" && currentUser.active !== false);

  return (
    <main className="gym-plans-page">
      <div className="diet-page">
        <section className="diet-hero">
          <p className="diet-eyebrow">FitSphere Nutrition</p>
          <h1>Diet Plans</h1>
          <p className="diet-hero-text">{pageIntro}</p>
        </section>

        {error ? <div className="diet-alert diet-alert--error">{error}</div> : null}
        {success ? <div className="diet-alert diet-alert--success">{success}</div> : null}

        {isAdmin || isTrainer ? (
          <section className="diet-card">
            <div className="diet-section-header">
              <div>
                <p className="diet-eyebrow">Create Plan</p>
                <h2>Assign Diet To A Client</h2>
                <p className="diet-section-text">
                  Choose a client first, then pick from the plans that client has already booked.
                </p>
              </div>
              <button type="button" className="diet-button diet-button--secondary" onClick={loadPlans}>
                Refresh
              </button>
            </div>

            <form className="diet-form" onSubmit={handleSubmit}>
              <div className="diet-form-grid">
                <select name="dietType" value={form.dietType} onChange={handleChange} className="diet-input">
                  <option value="Balanced">Balanced</option>
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Vegan">Vegan</option>
                  <option value="Keto">Keto</option>
                  <option value="Low Carb">Low Carb</option>
                  <option value="High Protein">High Protein</option>
                </select>
                <input
                  name="dailyCalories"
                  type="number"
                  min="0"
                  value={form.dailyCalories}
                  onChange={handleChange}
                  placeholder="Daily calories"
                  required
                  className="diet-input"
                />
                <select
                  name="userId"
                  value={form.userId}
                  onChange={handleChange}
                  required
                  className="diet-input"
                >
                  <option value="">Select client</option>
                  {clientOptions.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.fullName || client.username || "Client"} ({client.id})
                    </option>
                  ))}
                </select>
                <select
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="diet-input"
                  disabled={!form.userId}
                >
                  <option value="">{form.userId ? "Select booked plan name" : "Choose client first"}</option>
                  {bookedPlanOptions.map((planOption) => (
                    <option key={planOption.id} value={planOption.name}>
                      {planOption.name}
                    </option>
                  ))}
                </select>
                {isAdmin ? (
                  <select
                    name="trainerId"
                    value={form.trainerId}
                    onChange={handleChange}
                    required
                    className="diet-input"
                  >
                    <option value="">Select trainer</option>
                    {trainerOptions.map((trainer) => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.fullName || trainer.username || "Trainer"} ({trainer.id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    name="trainerId"
                    value={user?.id ?? ""}
                    readOnly
                    className="diet-input diet-input--readonly"
                    disabled
                  >
                    <option value={user?.id ?? ""}>
                      {(user?.fullName || user?.username || "Trainer")} ({user?.id ?? "N/A"})
                    </option>
                  </select>
                )}
              </div>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Plan description"
                rows={3}
                required
                className="diet-input diet-textarea"
              />

              <div className="diet-form-grid diet-form-grid--meals">
                <textarea
                  name="breakfastPlan"
                  value={form.breakfastPlan}
                  onChange={handleChange}
                  placeholder="Breakfast plan"
                  rows={3}
                  className="diet-input diet-textarea"
                />
                <textarea
                  name="lunchPlan"
                  value={form.lunchPlan}
                  onChange={handleChange}
                  placeholder="Lunch plan"
                  rows={3}
                  className="diet-input diet-textarea"
                />
                <textarea
                  name="dinnerPlan"
                  value={form.dinnerPlan}
                  onChange={handleChange}
                  placeholder="Dinner plan"
                  rows={3}
                  className="diet-input diet-textarea"
                />
                <textarea
                  name="snacksPlan"
                  value={form.snacksPlan}
                  onChange={handleChange}
                  placeholder="Snacks plan"
                  rows={3}
                  className="diet-input diet-textarea"
                />
              </div>

              <textarea
                name="restrictions"
                value={form.restrictions}
                onChange={handleChange}
                placeholder="Restrictions or diet notes"
                rows={2}
                className="diet-input diet-textarea"
              />

              <label className="diet-checkbox">
                <input name="active" type="checkbox" checked={form.active} onChange={handleChange} />
                Mark this diet plan as active
              </label>

              <div className="diet-actions">
                <button type="submit" disabled={isSaving} className="diet-button diet-button--primary">
                  {isSaving ? "Saving..." : "Publish Plan"}
                </button>
                <button type="button" onClick={resetForm} className="diet-button diet-button--secondary">
                  Reset
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="diet-card">
            <div className="diet-section-header">
              <div>
                <p className="diet-eyebrow">Read Only</p>
                <h2>Your Assigned Diet</h2>
                <p className="diet-section-text">
                  Clients can review the plan prepared for them, including assigned trainer details and meal guidance.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="diet-card">
          <div className="diet-section-header">
            <div>
              <p className="diet-eyebrow">Plan List</p>
              <h2>Diet Plans</h2>
              <p className="diet-section-text">{plansSubtitle}</p>
            </div>
            <button type="button" className="diet-button diet-button--secondary" onClick={loadPlans}>
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="diet-empty-state">
              <h3>Loading diet plans...</h3>
              <p>Please wait while the nutrition records are fetched.</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="diet-empty-state">
              <h3>No diet plans found</h3>
              <p>Once a plan is assigned, it will appear here with trainer details and meal guidance.</p>
            </div>
          ) : (
            <div className="diet-plan-grid">
              {plans.map((plan) => {
                const trainer = resolvePerson(plan.trainer, plan.trainerId, "Trainer");
                const createdBy = resolvePerson(plan.createdBy, plan.createdBy?.id, "Creator");
                const clientId = plan.user?.id ?? plan.userId ?? "Not available";

                return (
                  <article key={plan.id} className={plan.active ? "diet-plan-card" : "diet-plan-card is-inactive"}>
                    <div className="diet-plan-top">
                      <div>
                        <p className="diet-plan-label">Assigned Plan</p>
                        <h3>{plan.name || "Untitled Diet Plan"}</h3>
                        <p className="diet-plan-description">{plan.description || "No description provided."}</p>
                      </div>
                      <span className={plan.active ? "diet-status-pill is-active" : "diet-status-pill is-inactive"}>
                        {plan.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="diet-tag-row">
                      <span className="diet-tag diet-tag--type">{plan.dietType || "Diet"}</span>
                      <span className="diet-tag diet-tag--calories">
                        {plan.dailyCalories ? `${plan.dailyCalories} kcal` : "Calories n/a"}
                      </span>
                    </div>

                    <div className="diet-assignment-grid">
                      <div className="diet-assignment-card diet-assignment-card--client">
                        <span className="diet-assignment-title">Client ID</span>
                        <strong>{clientId}</strong>
                        <p>The current API response does not include full client details.</p>
                        <p>Show `user` or `userId` in the response to display the client name here.</p>
                      </div>

                      <div className="diet-assignment-card diet-assignment-card--trainer">
                        <span className="diet-assignment-title">Prepared By</span>
                        <strong>{trainer.name}</strong>
                        <p>ID: {trainer.id}</p>
                        <p>{trainer.email || "No trainer email available"}</p>
                      </div>
                    </div>

                    <div className="diet-notes-card">
                      <span className="diet-assignment-title">Created By</span>
                      <p>
                        {createdBy.name} ({createdBy.id})
                      </p>
                    </div>

                    <div className="diet-meal-grid">
                      <MealBlock title="Breakfast" value={plan.breakfastPlan} />
                      <MealBlock title="Lunch" value={plan.lunchPlan} />
                      <MealBlock title="Dinner" value={plan.dinnerPlan} />
                      <MealBlock title="Snacks" value={plan.snacksPlan} />
                    </div>

                    <div className="diet-notes-card">
                      <span className="diet-assignment-title">Restrictions / Notes</span>
                      <p>{plan.restrictions && plan.restrictions.trim() ? plan.restrictions : "No restrictions specified."}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

const MealBlock = ({ title, value }) => (
  <section className="diet-meal-card">
    <h4>{title}</h4>
    <p>{value && value.trim() ? value : "Not specified"}</p>
  </section>
);

export default DietFoodPage;
