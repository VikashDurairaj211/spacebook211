const SECTION_A = [
  [null, null, 3, 2, 1],
  [null, null, 4, 5, 6],
  [null, null, 9, 8, 7],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, null, 21, 22, 23],
  [24, null, 25, 26, 27],
  [28, 29, 30, 31, 32],
];

const SECTION_B = [
  [33, 34, 35, 36, 37, 38, 39],
  [46, 45, 44, 43, 42, 41, 40],
  [null, 47, 48, 49, 50, 51, 52],
  [null, 58, 57, 56, 55, 54, 53],
];

const SECTION_C = [
  [59, 60, 61, 62, 63, 64, 65],
  [72, 71, 70, 69, 68, 67, 66],
  [73, 74, 75, 76, 77, 78, 79],
  [86, 85, 84, 83, 82, 81, 80],
  [null, null, null, 87, 88, 89, 90],
  [null, null, null, 91, 92, 93, 94],
  [null, null, null, 95, 96, 97, 98],
];

function Seat({ seat, selected, onClick }) {
  if (!seat) {
    return <div className="m1-seat-gap" />;
  }

  const isBookable = seat.status === "vacant" || seat.status === "my-booked";

  return (
    <button
      type="button"
      className={`m1-seat m1-${seat.status} ${
        selected ? "m1-selected" : ""
      } ${!isBookable ? "m1-disabled" : ""}`}
      onClick={() => {
        if (isBookable) {
          onClick(seat);
        }
      }}
      disabled={!isBookable}
      title={`${seat.label} · ${
        selected
          ? "SELECTED"
          : seat.status === "my-booked"
          ? "SELECTED"
          : seat.status === "vacant"
          ? "AVAILABLE"
          : seat.status === "occupied"
          ? "BOOKED"
          : "PENDING CHECK-IN"
      }${!isBookable ? " (Unavailable)" : ""}`}
      aria-label={`${seat.label}, ${seat.status}`}
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
    <section className="m1-section">
      <div className="m1-section-title">{title}</div>

      <div
        className="m1-column-labels"
        style={{
          gridTemplateColumns: `var(--m1-label) repeat(${columns}, var(--m1-seat))`,
        }}
      >
        <span />
        {Array.from({ length: columns }, (_, index) => (
          <b key={index}>{index + 1}</b>
        ))}
      </div>

      <div className="m1-rows">
        {rows.map((row, rowIndex) => (
          <div
            className="m1-row"
            key={`${title}-${rowIndex}`}
            style={{
              gridTemplateColumns: `var(--m1-label) repeat(${columns}, var(--m1-seat))`,
            }}
          >
            <strong className="m1-row-label">
              {rowPrefix}
              {rowIndex + 1}
            </strong>

            {row.map((number, columnIndex) => {
              if (number === null) {
                return (
                  <div
                    className="m1-seat-cell"
                    key={`gap-${rowIndex}-${columnIndex}`}
                  >
                    <div className="m1-seat-gap" />
                  </div>
                );
              }

              const seat = seatsByNumber[number];

              return (
                <div className="m1-seat-cell" key={number}>
                  {seat && (
                    <Seat
                      seat={seat}
                      selected={seat.id === activeSeatId}
                      onClick={onSelect}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function Room({ children, className = "" }) {
  return (
    <div className={`m1-room ${className}`}>
      {children}
    </div>
  );
}

export default function FloorMapModule1({
  seats = [],
  onSelect,
  activeSeatId,
}) {
  const seatsByNumber = Object.fromEntries(
    seats.map((seat) => [seat.number, seat])
  );

  return (
    <div className="m1-map-wrapper">
      <div className="m1-title">
        TRAINING ROOM – MODULE 1 FLOOR MAP
      </div>

      <div className="m1-floor-map">
        <div className="m1-a">
          <Section
            title="SECTION A (Seats 1 – 32)"
            rows={SECTION_A}
            seatsByNumber={seatsByNumber}
            onSelect={onSelect}
            activeSeatId={activeSeatId}
            columns={5}
            rowPrefix="A"
          />
        </div>

        <div className="m1-reception">
          <Room className="m1-reception-room">
            RECEPTION
          </Room>
        </div>

        <div className="m1-c">
          <Section
            title="SECTION C (Seats 59 – 98)"
            rows={SECTION_C}
            seatsByNumber={seatsByNumber}
            onSelect={onSelect}
            activeSeatId={activeSeatId}
            columns={7}
            rowPrefix="C"
          />
        </div>

        <div className="m1-conference">
          <Room className="m1-conference-room">
            CONFERENCE
            <br />
            ROOM
          </Room>
        </div>

        <div className="m1-b">
          <Section
            title="SECTION B (Seats 33 – 58)"
            rows={SECTION_B}
            seatsByNumber={seatsByNumber}
            onSelect={onSelect}
            activeSeatId={activeSeatId}
            columns={7}
            rowPrefix="B"
          />
        </div>
      </div>

      <style>{`
        .m1-map-wrapper {
          --m1-seat: clamp(16px, 1.8vw, 25px);
          --m1-label: clamp(12px, 1.3vw, 19px);
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          margin: 0;
          padding: 2px 4px;
          display: flex;
          flex-direction: column;
          background: transparent;
        }

        .m1-title {
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

        .m1-floor-map {
          width: 100%;
          min-width: 0;
          display: grid;
          grid-template-columns: 33% 34% 33%;
          grid-template-rows: auto auto;
          grid-template-areas:
            "a reception c"
            "conference b c";
          gap: 0;
          padding: 2px;
          box-sizing: border-box;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }

        .m1-a {
          grid-area: a;
          min-width: 0;
          display: flex;
          justify-content: center;
        }

        .m1-reception {
          grid-area: reception;
          min-width: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2px 4px 6px;
        }

        .m1-b {
          grid-area: b;
          min-width: 0;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          margin-top: -22px;
          padding-top: 0;
        }

        .m1-c {
          grid-area: c;
          min-width: 0;
          display: flex;
          justify-content: center;
        }

        .m1-conference {
          grid-area: conference;
          min-width: 0;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 2px 4px;
          margin-top: 10px;
        }

        .m1-section {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: 2px;
          background: transparent;
        }

        .m1-section-title {
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

        .m1-column-labels {
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

        .m1-column-labels b {
          font-weight: 700;
        }

        .m1-rows {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .m1-row {
          display: grid;
          justify-content: center;
          align-items: center;
          gap: 2px;
        }

        .m1-row-label {
          color: #071d61;
          font-size: clamp(7px, 0.62vw, 9px);
          line-height: 1;
          text-align: left;
          font-weight: 700;
        }

        .m1-seat-cell {
          width: var(--m1-seat);
          height: var(--m1-seat);
          min-width: 0;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }

        .m1-seat {
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
          transition: transform 0.12s ease, box-shadow 0.12s ease;
        }

        .m1-seat:hover:not(.m1-disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(15, 23, 42, 0.15);
        }

        .m1-disabled {
          cursor: not-allowed !important;
          opacity: 0.95;
        }

        /* 🟦 AVAILABLE (White fill with blue outline) */
        .m1-vacant {
          background: #ffffff;
          border: 1.5px solid #2563eb;
          color: #2563eb;
        }

        /* 🔘 BOOKED (Slate / Grey solid) */
        .m1-occupied {
          background: #8e9eb5;
          border: 1.5px solid #77889f;
          color: #ffffff;
        }

        /* 🟨 PENDING CHECK-IN (Pale yellow with orange outline) */
        .m1-reserved {
          background: #fef3c7;
          border: 1.5px solid #f59e0b;
          color: #b45309;
        }

        /* ⬛ SELECTED / MY BOOKING (Dark Navy Solid) */
        .m1-selected,
        .m1-my-booked {
          background: #1e3a8a !important;
          border: 1.5px solid #0f172a !important;
          color: #ffffff !important;
          box-shadow: 0 0 0 2px rgba(30, 58, 138, 0.35) !important;
        }

        .m1-seat-gap {
          width: 94%;
          height: 90%;
          box-sizing: border-box;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          background: #f8fafc;
          display: grid;
          place-items: center;
        }

        .m1-room {
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          box-sizing: border-box;
          width: 82%;
          height: clamp(44px, 5.5vw, 68px);
          border-radius: 8px;
          font-size: clamp(8px, 0.75vw, 11px);
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: 0.04em;
        }

        .m1-reception-room {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #2563eb;
        }

        .m1-conference-room {
          background: #f5f3ff;
          border: 1px solid #ddd6fe;
          color: #7c3aed;
        }
      `}</style>
    </div>
  );
}