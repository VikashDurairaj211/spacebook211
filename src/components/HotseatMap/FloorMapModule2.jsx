const SECTION_A = [
  [1, 2, 3, 4, 5, 6, 7],
  [14, 13, 12, 11, 10, 9, 8],
  [15, 16, 17, 18, 19, null, 20],
  [26, 25, 24, 23, 22, null, 21],
  [27, 28, 29, 30, 31, 32, 33],
  [40, 39, 38, 37, 36, 35, 34],
  [41, 42, 43, 44, 45, 46, 47],
  [54, 53, 52, 51, 50, 49, 48],
  [55, 56, 57, 58, 59, null, null],
];

const SECTION_B = [
  [60, 61, 62, 63, 64],
  [69, 68, 67, 66, 65],
  [70, 71, 72, 73, 74],
  [79, 78, 77, 76, 75],
];

const SECTION_C = [
  [null, 80, 81, 82, 83, 84, 85, null],
  [93, 92, 91, 90, 89, 88, 87, 86],
  [94, 95, 96, 97, 98, 99, 100, 101],
  [109, 108, 107, 106, 105, 104, 103, 102],
  [110, 111, 112, 113, 114, 115, 116, null],
  [121, 120, 119, 118, 117, null, null, null],
  [122, 123, 124, 125, 126, null, null, null],
  [131, 130, 129, 128, 127, null, null, null],
];

function Seat({ seat, selected, onClick }) {
  if (!seat) {
    return <div className="m2-seat-gap" />;
  }

  // Normalize status to support both parent and internal variations
  const rawStatus = (seat.status || "").toLowerCase();
  const isOccupied =
    rawStatus === "occupied" ||
    rawStatus === "booked" ||
    rawStatus === "confirmed" ||
    rawStatus === "approved" ||
    rawStatus === "checked in" ||
    rawStatus === "checkedin" ||
    rawStatus === "1" ||
    rawStatus === "true" ||
    seat.isBooked === true ||
    seat.isOccupied === true;

  const isReserved = rawStatus === "reserved" || rawStatus === "pending";
  const isMyBooked = rawStatus === "my-booked" || seat.isMyBooking === true;
  const isAvailable = !isOccupied && !isReserved && !isMyBooked;

  let statusClass = "m2-vacant";
  if (selected || rawStatus === "selected") {
    statusClass = "m2-selected";
  } else if (isMyBooked) {
    statusClass = "m2-my-booked";
  } else if (isOccupied) {
    statusClass = "m2-occupied";
  } else if (isReserved) {
    statusClass = "m2-reserved";
  } else {
    statusClass = "m2-vacant";
  }

  // Available seats and user's own booking are clickable.
  const isBookable = isAvailable || isMyBooked;

  return (
    <button
      type="button"
      className={`m2-seat ${statusClass} ${
        selected ? "m2-selected" : ""
      } ${!isBookable ? "m2-disabled" : ""}`}
      onClick={() => {
        if (isBookable) {
          onClick(seat);
        }
      }}
      disabled={!isBookable}
      title={`${seat.label || `Seat ${seat.number}`} · ${
        selected || rawStatus === "selected"
          ? "SELECTED"
          : isMyBooked
          ? "MY BOOKING"
          : isAvailable
          ? "AVAILABLE"
          : isOccupied
          ? "BOOKED"
          : isReserved
          ? "PENDING CHECK-IN"
          : "UNAVAILABLE"
      }${!isBookable ? " (Unavailable)" : ""}`}
      aria-label={`${seat.label || `Seat ${seat.number}`}, ${seat.status}`}
    >
      {seat.number}
    </button>
  );
}

function Section({
  title,
  rows,
  rowPrefix,
  seatsByNumber,
  onSelect,
  activeSeatId,
  columns,
}) {
  return (
    <section className="m2-section">
      <div className="m2-section-title">
        {title}
      </div>

      <div
        className="m2-column-labels"
        style={{
          gridTemplateColumns:
            `var(--m2-label) repeat(${columns}, var(--m2-seat))`,
        }}
      >
        <span />

        {Array.from(
          { length: columns },
          (_, index) => (
            <b key={index}>
              {index + 1}
            </b>
          )
        )}
      </div>

      <div className="m2-rows">
        {rows.map(
          (row, rowIndex) => (
            <div
              className="m2-row"
              key={`${title}-${rowIndex}`}
              style={{
                gridTemplateColumns:
                  `var(--m2-label) repeat(${columns}, var(--m2-seat))`,
              }}
            >
              <strong className="m2-row-label">
                {rowPrefix}
                {rowIndex + 1}
              </strong>

              {row.map(
                (
                  number,
                  columnIndex
                ) => {
                  if (number === null) {
                    return (
                      <div
                        className="m2-seat-cell"
                        key={`gap-${rowIndex}-${columnIndex}`}
                      >
                        <div 
                          className="m2-seat-gap m2-seat-unavailable" 
                          title="Unavailable"
                        />
                      </div>
                    );
                  }

                  const seat =
                    seatsByNumber[number];

                  return (
                    <div
                      className="m2-seat-cell"
                      key={number}
                    >
                      {seat && (
                        <Seat
                          seat={seat}
                          selected={
                            seat.id ===
                            activeSeatId
                          }
                          onClick={onSelect}
                        />
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )
        )}
      </div>
    </section>
  );
}

function Room({
  children,
  className = "",
}) {
  return (
    <div
      className={`m2-room ${className}`}
    >
      {children}
    </div>
  );
}

export default function FloorMapModule2({
  seats = [],
  onSelect,
  activeSeatId,
}) {
  // Strictly filter seats for Module 2 (EO2) so they never cross-contaminate with Module 1
  const seatsByNumber = Object.fromEntries(
    seats
      .filter((seat) => !seat.id || seat.id.includes("EO2"))
      .map((seat) => [seat.number, seat])
  );

  return (
    <div className="m2-map-wrapper">

      <div className="m2-title">
        MODULE 2 FLOOR MAP
      </div>

      <div className="m2-floor-map">

        {/* SECTION C */}
        <div className="m2-c">
          <Section
            title="SECTION C (Seats 80 – 131)"
            rows={SECTION_C}
            seatsByNumber={
              seatsByNumber
            }
            onSelect={onSelect}
            activeSeatId={
              activeSeatId
            }
            columns={8}
            rowPrefix="C"
          />
        </div>

        {/* SECTION A */}
        <div className="m2-a">
          <Section
            title="SECTION A (Seats 1 – 59)"
            rows={SECTION_A}
            seatsByNumber={
              seatsByNumber
            }
            onSelect={onSelect}
            activeSeatId={
              activeSeatId
            }
            columns={7}
            rowPrefix="A"
          />
        </div>

        {/* SECTION B */}
        <div className="m2-b">
          <Section
            title="SECTION B (Seats 60 – 79)"
            rows={SECTION_B}
            seatsByNumber={
              seatsByNumber
            }
            onSelect={onSelect}
            activeSeatId={
              activeSeatId
            }
            columns={5}
            rowPrefix="B"
          />
        </div>

        {/* TRAINING ROOM */}
        <div className="m2-training">
          <Room className="m2-training-room">
            TRAINING
            <br />
            ROOM
          </Room>
        </div>

      </div>

      <style>{`
        .m2-map-wrapper {
          --m2-seat: clamp(16px, 1.8vw, 25px);
          --m2-label: clamp(12px, 1.3vw, 19px);

          width: 100%;
          min-width: 0;
          box-sizing: border-box;

          margin: 0;
          padding: 2px 4px;

          display: flex;
          flex-direction: column;

          background: transparent;
        }

        .m2-title {
          flex: 0 0 auto;

          width: 100%;

          margin: 0 0 4px;
          padding: 0;

          box-sizing: border-box;

          text-align: center;

          color: #071d61;

          font-size: clamp(12px, 1.2vw, 16px);
          line-height: 1.1;

          font-weight: 800;

          letter-spacing: 0.025em;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .m2-floor-map {
          width: 100%;
          min-width: 0;

          display: grid;

          grid-template-columns: 50% 50%;
          grid-template-rows: auto auto;

          grid-template-areas:
            "c a"
            "b training";

          gap: 0;

          padding: 2px;

          box-sizing: border-box;

          background: #ffffff;

          border: 1px solid #e2e8f0;

          border-radius: 8px;
        }

        .m2-c {
          grid-area: c;

          min-width: 0;

          display: flex;
          justify-content: center;

          border-right: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }

        .m2-a {
          grid-area: a;

          min-width: 0;

          display: flex;
          justify-content: center;

          border-bottom: 1px solid #e2e8f0;
        }

        .m2-b {
          grid-area: b;

          min-width: 0;

          display: flex;
          justify-content: center;
          align-items: flex-start;

          border-right: 1px solid #e2e8f0;

          padding-top: 4px;
        }

        .m2-training {
          grid-area: training;

          min-width: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 4px;
        }

        .m2-section {
          width: 100%;
          min-width: 0;

          box-sizing: border-box;

          padding: 2px;

          background: transparent;
        }

        .m2-section-title {
          width: max-content;
          max-width: 95%;

          margin: 0 auto 3px;

          padding: 2px 8px;

          box-sizing: border-box;

          background: #062268;
          color: #ffffff;

          border-radius: 4px;

          text-align: center;

          font-size: clamp(7.5px, 0.7vw, 10px);
          line-height: 1.1;

          font-weight: 800;

          letter-spacing: 0.02em;

          white-space: nowrap;
        }

        .m2-column-labels {
          display: grid;

          justify-content: center;
          align-items: center;

          gap: 2px;

          margin-bottom: 2px;

          color: #071d61;

          font-size: clamp(7px, 0.62vw, 9px);

          line-height: 1;

          text-align: center;
        }

        .m2-column-labels b {
          font-weight: 700;
        }

        .m2-rows {
          width: 100%;

          display: flex;
          flex-direction: column;

          gap: 2px;
        }

        .m2-row {
          display: grid;

          justify-content: center;
          align-items: center;

          gap: 2px;
        }

        .m2-row-label {
          color: #071d61;

          font-size: clamp(7px, 0.62vw, 9px);

          line-height: 1;

          text-align: left;

          font-weight: 700;
        }

        .m2-seat-cell {
          width: var(--m2-seat);
          height: var(--m2-seat);

          min-width: 0;
          min-height: 0;

          display: flex;

          align-items: center;
          justify-content: center;

          box-sizing: border-box;
        }

        .m2-seat {
          width: 94%;
          height: 90%;

          min-width: 0;
          min-height: 0;

          padding: 0;

          box-sizing: border-box;

          border-radius: 4px;

          font-size: clamp(7px, 0.65vw, 9.5px);

          font-weight: 700;

          line-height: 1;

          cursor: pointer;

          transition:
            transform 0.12s ease,
            box-shadow 0.12s ease;
        }

        .m2-seat:hover:not(.m2-disabled) {
          transform: translateY(-1px);

          box-shadow:
            0 2px 4px
            rgba(15, 23, 42, 0.15);
        }

        .m2-disabled {
          cursor: not-allowed !important;
          opacity: 0.95;
        }

        .m2-vacant {
          background: #22c55e;
          border: 1.5px solid #16a34a;
          color: #ffffff;
        }

        .m2-occupied {
          background: #ef4444 !important;
          border: 1.5px solid #dc2626 !important;
          color: #ffffff !important;
        }

        .m2-reserved {
          background: #fef3c7;
          border: 1.5px solid #f59e0b;
          color: #b45309;
        }

        .m2-my-booked {
          background: #ef4444 !important;
          border: 1.5px solid #dc2626 !important;
          color: #ffffff !important;

          box-shadow:
            0 0 0 2px
            rgba(239, 68, 68, 0.30) !important;
        }

        .m2-selected {
          background: #3b82f6 !important;
          border: 1.5px solid #2563eb !important;
          color: #ffffff !important;

          box-shadow:
            0 0 0 2px
            rgba(59, 130, 246, 0.35) !important;
        }

        .m2-seat-gap {
          width: 94%;
          height: 90%;

          box-sizing: border-box;

          border: 1px solid #e5e7eb;

          border-radius: 4px;

          background: #f8fafc;

          display: grid;
          place-items: center;
        }

        /* Added grey styling for unavailable null slots in Module 2 */
        .m2-seat-unavailable {
          background: #94a3b8 !important;
          border: 1.5px solid #64748b !important;
        }

        .m2-room {
          display: flex;

          align-items: center;
          justify-content: center;

          text-align: center;

          box-sizing: border-box;

          width: 78%;
          height: clamp(48px, 6vw, 75px);

          border-radius: 8px;

          font-size: clamp(8px, 0.75vw, 11px);

          line-height: 1.2;

          font-weight: 800;

          letter-spacing: 0.04em;
        }

        .m2-training-room {
          background: #fffbeb;

          border: 1px solid #fde68a;

          color: #b45309;
        }
      `}</style>
    </div>
  );
}