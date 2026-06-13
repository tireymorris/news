const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export const parseMonth = (month: string): { year: number; month: number } => {
  if (!MONTH_PATTERN.test(month)) {
    throw new Error(`Invalid month: ${month}`);
  }

  const [year, monthNumber] = month.split("-").map(Number);
  return { year, month: monthNumber };
};

export const monthBounds = (
  month: string,
): { startDate: string; endDate: string } => {
  const { year, month: monthNumber } = parseMonth(month);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 0));

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

export const previousMonth = (month: string): string => {
  const { year, month: monthNumber } = parseMonth(month);
  const date = new Date(Date.UTC(year, monthNumber - 2, 1));
  return date.toISOString().slice(0, 7);
};

export const monthsBackward = (
  endMonth: string,
  floorMonth: string,
): string[] => {
  const months: string[] = [];
  let current = endMonth;

  while (current >= floorMonth) {
    months.push(current);
    current = previousMonth(current);
  }

  return months;
};
