export const state = {
  accounts: [],
  adminSearchQuery: '',
  currentSchool: null,
  currentUser: null,
  devMode: false,
};

export function isCurrentUserAdmin() {
  return state.currentUser &&
    (state.currentUser.userType === -1 || state.currentUser.userType === -2);
}
