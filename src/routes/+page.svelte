<script lang="ts">
  import { goto } from "$app/navigation";

  import StashLogo from "$lib/assets/StashLogo.png";
  import { gameServer } from "$lib/requests";
  import { gamePath } from "$lib/routes";
  import { dialog, openDialog, selectColor } from "$lib/state/dialog.svelte";
  import {
    appendNotification,
    bold,
  } from "$lib/state/notifications.svelte";
  import { progressBar } from "$lib/state/progress.svelte";
  import { startSession } from "$lib/state/session.svelte";
  import type { DialogField } from "$lib/types";

  const fieldsToValues = (fields: DialogField[]) => {
    const values: Record<string, any> = {};
    fields.forEach((field) => {
      values[field.name] = field.value;
    });
    return values;
  };

  const showCreateGame = () => {
    appendNotification([
      "enter your ",
      bold("username"),
      " and ",
      bold("game configuration"),
    ]);

    openDialog(
      [
        { name: "username", value: "" },
        { name: "configuration", type: "text" },
        { name: "max players", value: 2, type: "range", min: 2, max: 4 },
        { name: "card count", value: 5, type: "range", min: 2, max: 15 },
      ],
      handleCreate
    );
  };

  const showJoinGame = () => {
    appendNotification([
      "enter your ",
      bold("username"),
      " and ",
      bold("game id"),
    ]);

    openDialog(
      [
        { name: "username", value: "" },
        { name: "game id", value: "" },
      ],
      handleJoin
    );
  };

  const showHelp = () => {
    appendNotification([
      "contact ",
      bold("@redicrafty on X"),
      " or ",
      bold("@0digt on Instagram"),
    ]);
    selectColor()
      .then((color) => appendNotification(["you chose ", bold(color), " color"]))
      .catch(() => {});
  };

  const handleCreate = async () => {
    progressBar.set(25);

    const fields = fieldsToValues(dialog.form);

    dialog.open = false;
    if (fields["username"] && fields["max players"]) {
      appendNotification(["creating a ", bold(`${fields["max players"]} player game`)]);

      try {
        const { key, state } = await gameServer.create(fields["username"], {
          max_players: fields["max players"],
          card_count: fields["card count"],
        });
        console.debug("game created with state", state);
        appendNotification([bold("successfully created game!")]);
        startSession(key, fields["username"]);
        await goto(gamePath(key));
      } catch (error) {
        appendNotification(`unable to create game (${(error as Error).message})`);
      }
    } else {
      appendNotification("invalid information");
    }
    progressBar.complete();
  };

  const handleJoin = () => {
    const fields = fieldsToValues(dialog.form);

    dialog.open = false;
    if (fields["username"] && fields["game id"]) {
      appendNotification(
        [
          "trying to join ",
          bold(fields["game id"]),
          " as ",
          bold(fields["username"]),
        ],
        2
      );
      gameServer
        .join(fields["username"], fields["game id"])
        .then(async () => {
          appendNotification("successfully joined game", 2);
          startSession(fields["game id"], fields["username"]);
          await goto(gamePath(fields["game id"]));
        })
        .catch((error) => {
          appendNotification(`unable to join game (${(error as Error).message})`);
        });
    } else {
      appendNotification("invalid information");
    }
  };

  const actions = [
    { name: "create", color: "bg-green-600", handle: showCreateGame },
    { name: "join", color: "bg-blue-700", handle: showJoinGame },
    { name: "help", handle: showHelp },
  ];
</script>

<div
  class="w-full h-[95vh] p-2 flex flex-col justify-center items-center space-y-10 text-center"
>
  <div class="flex flex-col justify-center items-center -space-y-20">
    <img src={StashLogo} alt="stash logo" class="w-[50vh] sm:h-[50vh]" />
    <p class="text-white" style="text-shadow: 0px 3px 3px rgba(15, 23, 42);">
      Where Strategy Meets the Shuffle - Play Your Cards Wisely!
    </p>
  </div>
  <div class="flex flex-row justify-center items-center space-x-5">
    {#each actions as action}
      <button
        onclick={() => {
          if (action.handle) action.handle();
        }}
        class="{action.color
          ? action.color
          : 'bg-gray-950'} p-2 text-lg rounded-xl hover:scale-125 duration-150 delay-75"
        >{action.name}</button
      >
    {/each}
  </div>
</div>
