/** "₨1,250" — manual grouping so it never depends on Intl locale data. */
export function formatPKR(amount: number | null): string {
  if (amount === null) return '₨ —';
  const [int, frac] = amount.toFixed(2).replace(/\.00$/, '').split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `₨${grouped}${frac ? `.${frac}` : ''}`;
}
