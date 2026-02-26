export type AuthTokenResponse = {
  access_token: string;
  token_type: "bearer";
};

export type MeResponse = {
  id: string;
  email: string;
  created_at?: string;
};
