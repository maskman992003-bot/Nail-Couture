export type PublicTabParamList = {
  Home: undefined;
  Lookbook: undefined;
  Services: undefined;
  About: undefined;
};

export type RootStackParamList = {
  Public: undefined;
  Login: undefined;
  Register: { ref?: string } | undefined;
  CheckIn: undefined;
  Main: undefined;
};
