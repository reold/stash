export const serverURL = import.meta.env.PROD
  ? "https://backend-1-d2336410.deta.app"
  : "http://localhost:4200";
export const apiURL = serverURL + "/api";

export const gameServer = {
  create: async (
    creator: string,
    config: { max_players?: number; card_count?: number } = {}
  ) => {
    let body = JSON.stringify({ creator, config });

    console.log("body", body);

    let resp = await fetch(`${apiURL}/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (resp.status != 200) {
      throw new Error(await resp.text());
    }

    return await resp.json();
  },

  join: async (username: string, game_id: string) => {
    let resp = await fetch(
      `${apiURL}/join/${game_id}?username=${username}`,
      {}
    );

    if (resp.status != 200) {
      throw new Error(await resp.text());
    }
  },

  state: async (game_id: string, depth: number, username: string = "") => {
    let resp = await fetch(
      `${apiURL}/${game_id}/state?depth=${depth}&username=${username}`
    );

    if (resp.status != 200) {
      throw new Error(await resp.text());
    }

    return await resp.json();
  },

  action: async (game_id, username: string, type: number, card: number = 0) => {
    let body = JSON.stringify({ username, type, card });

    let resp = await fetch(`${apiURL}/${game_id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (resp.status != 200) {
      throw new Error(await resp.text());
    }

    if (type == 0b01 || type == 0b10) return await resp.json();
  },
};
