"use client";

import dynamic from 'next/dynamic'
import { useEffect, useState, Component, useCallback } from "react";
import { socket } from "@/socket.mjs";
import { NickName } from "@/app/nickNameForm";
import { Lobby } from "@/app/lobby";
import { CreateRoomForm } from "@/app/createRoomForm";

const GameBridge = dynamic(() => import('@/app/game/gameBridge').then(m => m.GameBridge), {
  ssr: false,
});

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [renderNickNameForm, setRenderNickNameForm] = useState(true);
  const [renderLobby, setRenderLobby] = useState(false);
  const [renderCreateRoomForm, setRenderCreateRoomForm] = useState(false);
  const [renderGame, setRenderGame] = useState(false);
  const [nickName, setNickName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [team, setTeam] = useState('');

  const joinTeamResult = useCallback((data: { success: boolean, team: string }) => {
    if (!data.success) return;

    setTeam(data.team);
    setRenderGame(true);
  }, []);

  useEffect(() => {
    if (socket.connected) {
      onConnect();
    }

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  useEffect(() => {
    socket.on("joinTeamResult", joinTeamResult);

    return () => {
      socket.off("joinTeamResult", joinTeamResult);
    };
  }, [joinTeamResult]);

  const _onSetNickName = (nickName: string) => {
    setNickName(nickName);
    setRenderNickNameForm(false);
    setRenderLobby(true);
  };

  const _onClickCancelSetNickName = () => {
    setRenderNickNameForm(false);
    setRenderLobby(true);
  };

  const _onClickCreateRoom = () => {
    setRenderLobby(false);
    setRenderCreateRoomForm(true);
  };

  const _onClickCancelCreateRoom = () => {
    setRenderLobby(true);
    setRenderCreateRoomForm(false);
  };

  const _onCreateRoom = (roomName: string) => {
    setRoomName(roomName);
    setRenderCreateRoomForm(false);
    socket.emit('joinTeam');
  };

  const _onClickChangeNickName = () => {
    setRenderLobby(false);
    setRenderNickNameForm(true);
  };

  const _onJoinRoom = (roomName: string) => {
    setRoomName(roomName);
    setRenderLobby(false);
    socket.emit('joinTeam');
  };

  const _onQuitGame = () => {
    setRenderGame(false);
    setRenderLobby(true);
  };

  return (
    <div>
      <p>Status: {isConnected ? "connected" : "disconnected"}</p>

      {renderNickNameForm && <NickName nickName={nickName}
        onClickCancel={_onClickCancelSetNickName} onSetNickName={_onSetNickName} />}

      {renderLobby && <Lobby onClickCreateRoom={_onClickCreateRoom}
        onClickChangeNickName={_onClickChangeNickName} onJoinRoom={_onJoinRoom} />}

      {renderCreateRoomForm && <CreateRoomForm onClickCancel={_onClickCancelCreateRoom} onCreateRoom={_onCreateRoom} />}

      {renderGame && <GameBridge nickName={nickName} roomName={roomName} team={team} onQuitGame={_onQuitGame} />}
    </div>
  );
}