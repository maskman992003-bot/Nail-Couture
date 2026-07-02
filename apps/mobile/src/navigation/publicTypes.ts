export type PublicTabParamList = {
  Home: undefined;
  Lookbook: undefined;
  Services: undefined;
  About: undefined;
  FitnessAssessment: undefined;
};

export type RootStackParamList = {
  Public: undefined;
  Login: undefined;
  Register: { ref?: string; gift?: string; complete?: boolean; phone?: string } | undefined;
  GiftClaim: { token: string };
  CheckIn: undefined;
  Main: undefined;
};
