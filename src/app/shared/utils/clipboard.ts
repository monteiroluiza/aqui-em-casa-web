/** Copia a seleção também em navegadores sem Clipboard API disponível. */
export async function copyInputValue(input: HTMLInputElement): Promise<boolean> {
  if (!input.value) return false;
  const previousFocus = document.activeElement as HTMLElement | null;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(input.value);
      return true;
    }
  } catch { /* Tenta a cópia pela seleção quando a API é bloqueada. */ }
  input.focus();
  input.select();
  input.setSelectionRange(0, input.value.length);
  try {
    const copied = document.execCommand('copy');
    if (copied) previousFocus?.focus();
    return copied;
  } catch {
    return false;
  }
}
