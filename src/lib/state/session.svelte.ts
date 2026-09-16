/**
 * Who is playing which game.
 *
 * With hash-only links the game id and the username lived in the URL fragment
 * and in page props. The game id is now the route (`/game/<id>/`) and the
 * username lives here: you can open a game link directly and the route asks for
 * a username before seating you at the table.
 */
export const session = $state<{ gameId: string | null; username: string | null }>({
  gameId: null,
  username: null,
});

export const startSession = (gameId: string, username: string) => {
  session.gameId = gameId;
  session.username = username;
};

export const endSession = () => {
  session.gameId = null;
  session.username = null;
};
