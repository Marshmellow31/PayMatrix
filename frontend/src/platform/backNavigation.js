const handlers = [];
let sequence = 0;

export const registerBackHandler = (handler, priority = 0) => {
  const entry = { handler, priority, sequence: sequence++ };
  handlers.push(entry);

  return () => {
    const index = handlers.indexOf(entry);
    if (index >= 0) handlers.splice(index, 1);
  };
};

export const consumeBackRequest = () => {
  const ordered = [...handlers].sort(
    (left, right) => right.priority - left.priority || right.sequence - left.sequence
  );

  for (const entry of ordered) {
    if (entry.handler() === true) return true;
  }

  return false;
};
