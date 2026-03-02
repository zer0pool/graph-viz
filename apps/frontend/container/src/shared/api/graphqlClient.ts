import { config } from "./config";

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; locations: any[]; path: string[] }>;
}

export const graphqlClient = {
  async fetch<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
    const endpoint = `${config.BASE_URL}/analytics-manager/graphql`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed with status ${response.status}`);
    }

    const { data, errors }: GraphQLResponse<T> = await response.json();

    if (errors && errors.length > 0) {
      console.error("[GraphQL] Errors:", errors);
      throw new Error(errors[0].message);
    }

    if (!data) {
      throw new Error("No data returned from GraphQL");
    }

    return data;
  },
};
