import { useState } from 'react';

const MAX_ORBS = 8;

export default function MagicOrbs() {
  const [orbs, setOrbs] = useState([
    { id: 1, delay: 0, duration: 20 },
  ]);

  function handleClick(id) {
    setOrbs((current) => {
      if (current.length >= MAX_ORBS) return current;
      const nextId = current.reduce((m, o) => Math.max(m, o.id), 1) + 1;
      const extra = {
        id: nextId,
        delay: Math.random() * 8,
        duration: 16 + Math.random() * 10,
      };
      const extra2 = {
        id: nextId + 1,
        delay: Math.random() * 8,
        duration: 16 + Math.random() * 10,
      };
      return [...current, extra, extra2].slice(0, MAX_ORBS);
    });
  }

  return (
    <div className="magic-orbs-root" aria-hidden="true">
      {orbs.map((orb) => (
        <button
          key={orb.id}
          type="button"
          className="magic-orb"
          style={{
            animationDuration: `${orb.duration}s`,
            animationDelay: `${orb.delay}s`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleClick(orb.id);
          }}
        />
      ))}
    </div>
  );
}

