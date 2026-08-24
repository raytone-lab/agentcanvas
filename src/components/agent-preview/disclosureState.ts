export type DisclosureStateInput = {
  desiredOpen: boolean;
  currentOpen: boolean;
  userToggled: boolean;
};

export function deriveDisclosureOpen({ desiredOpen, currentOpen, userToggled }: DisclosureStateInput): boolean {
  if (userToggled) {
    return currentOpen;
  }
  return desiredOpen;
}
