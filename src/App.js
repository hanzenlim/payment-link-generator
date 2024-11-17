import React, { useState } from "react";
import './App.css';

function App() {
  const [bookingId, setBookingId] = useState("");
  const [reservationData, setReservationData] = useState(null);
  const [error, setError] = useState(null);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState("");


  const handleReservationLookup = async (event) => {
    event.preventDefault();
    setError(null);
    setReservationData(null);

    if (!bookingId.trim()) {
      setError("Booking ID is required.");
      return;
    }

    try {
      const response = await fetch(
        "https://levo-payment-link-729510442010.us-central1.run.app/booking",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ bookingId }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch reservation data.");
      }

      const data = await response.json();
      const reservation =
        data.Reservations?.Reservation?.[0]?.BookingTran?.[0] || null;

      if (!reservation) {
        throw new Error("No reservation data found.");
      }

      console.log('reservation::', reservation)

      const totalAmountAfterTax = parseFloat(reservation.TotalAmountAfterTax) || 0;
      const totalPayment = parseFloat(reservation.TotalPayment) || 0;
      const extraCharges = reservation.ExtraCharge?.reduce(
        (sum, charge) => sum + parseFloat(charge.AmountAfterTax || 0),
        0
      ) || 0;

      const totalAmount = totalAmountAfterTax + extraCharges;
      const balance = totalAmount - totalPayment;

      const firstName = data.Reservations?.Reservation?.[0]?.FirstName || '';
      const lastName = data.Reservations?.Reservation?.[0]?.LastName || '';

      setReservationData({
        firstName,
        lastName,
        subtotal: totalAmountAfterTax,
        extraCharges,
        totalAmount,
        totalPayment,
        balance,
        extraChargeDetails: reservation.ExtraCharge || [],
        ratePlanName: reservation.RateplanName,
      });

      if (balance) {
      setAmount(balance.toFixed(2));
      } else {
        setAmount(totalAmount.toFixed(2));
      }
      setDescription(`${firstName} ${lastName} booking no: ${bookingId}`)
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePaymentLinkRequest = async () => {
    try {
      if (parseFloat(amount) === 0) {
        alert('Amount cannot be 0. Please enter amount higher than 0');
        return;
      }
      const response = await fetch(
        "https://levo-payment-link-729510442010.us-central1.run.app/payment-link",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            externalId: `levo-hotel-booking-id-${bookingId}`,
            amount,
            description,
            customer: {
              given_names: `${reservationData.firstName} ${reservationData.lastName}`,
            },
            items: [
              {
                name: "Levo Hotel Room Accomodation",
                "quantity": 1,
                "price": amount,
                "category": "Room Accomodation",
                "url": "https://www.levohotel.com"
              }
            ],
            currency: "PHP",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create payment link.");
      }

      const data = await response.json();
      setInvoiceUrl(data.invoice_url);

        alert("Payment link created successfully!");
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", padding: "20px" }}>
      <h1>Reservation Lookup</h1>
      <form onSubmit={handleReservationLookup}>
        <div>
          <label htmlFor="bookingId">Reservation Number</label>
          <input
            type="text"
            id="bookingId"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            placeholder="Enter your reservation number"
            style={{ width: "95%", padding: "8px", marginTop: "8px" }}
          />
        </div>
        <button
          type="submit"
          style={{
            marginTop: "16px",
            padding: "10px",
            width: "100%",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Lookup Reservation
        </button>
      </form>

      {error && (
        <div style={{ color: "red", marginTop: "16px" }}>{error}</div>
      )}

      {reservationData && (
        <>
          <div style={{ marginTop: "16px", background: '#dfdfdf', padding: '16px' }}>
            <h2 style={{ margin: 0 }}>Reservation Details</h2>
            <p>
              <strong>First Name:</strong> {reservationData.firstName}
            </p>
            <p>
              <strong>Last Name:</strong> {reservationData.lastName}
            </p>
            <hr />
            <p>
              <strong>Subtotal:</strong> {reservationData.subtotal.toFixed(2)}
            </p>
            <p>
              <strong>Extra Charges:</strong> {reservationData.extraCharges.toFixed(2)}
            </p>
            <p>
              <strong>Total Amount:</strong> {reservationData.totalAmount.toFixed(2)}
            </p>
            <hr />
            <p>
              <strong>Total Payment:</strong> {reservationData.totalPayment.toFixed(2)}
            </p>
            <p>
              <strong>Balance:</strong> {reservationData.balance.toFixed(2)}
            </p>
          </div>

          <div style={{ marginTop: "26px", marginBottom: "40px" }}>
            <h2>Create Payment Link</h2>
            <div>
              <label>Amount:</label>
              <input
                type="input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ width: "100%", padding: "8px", marginTop: "8px" }}
              />
            </div>
            <div>
              <label>Description:</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description"
                style={{ width: "100%", padding: "8px", marginTop: "8px" }}
              />
            </div>
            <button
              onClick={handlePaymentLinkRequest}
              style={{
                marginTop: "16px",
                padding: "10px",
                width: "100%",
                backgroundColor: "#28a745",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
              }}
            >
              Create Payment Link
            </button>
            {invoiceUrl && (
              <div style={{ marginTop: "16px" }}>
                <h2>Payment Link</h2>
                <a href={invoiceUrl} target="_blank" rel="noopener noreferrer">
                  {invoiceUrl}
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
