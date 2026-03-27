const DIALOG_SHOWN_KEY = "demo_graduation_dialog_shown";

export function hasDemoGraduationDialogBeenShown(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const shown = localStorage.getItem(DIALOG_SHOWN_KEY);
    return shown === "true";
  } catch (error) {
    console.error("Error reading demo graduation dialog state:", error);
    return false;
  }
}

export function markDemoGraduationDialogAsShown(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(DIALOG_SHOWN_KEY, "true");
  } catch (error) {
    console.error("Error saving demo graduation dialog state:", error);
  }
}

export function resetDemoGraduationDialogState(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(DIALOG_SHOWN_KEY);
  } catch (error) {
    console.error("Error resetting demo graduation dialog state:", error);
  }
}
