export function check(error) {
  if (error) throw new Error(error.message || 'The request could not be completed.');
}
