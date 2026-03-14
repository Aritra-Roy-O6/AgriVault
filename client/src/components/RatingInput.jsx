const STAR_VALUES = [1, 2, 3, 4, 5];

export default function RatingInput({ currentRating = 0, disabled = false, onRate }) {
  return (
    <div className="rating-stars" aria-label="Rate this storage space">
      {STAR_VALUES.map((value) => {
        const active = value <= Number(currentRating || 0);
        return (
          <button
            className={`rating-star${active ? " active" : ""}`}
            disabled={disabled}
            key={value}
            onClick={() => onRate(value)}
            type="button"
          >
            {active ? "★" : "☆"}
          </button>
        );
      })}
    </div>
  );
}
