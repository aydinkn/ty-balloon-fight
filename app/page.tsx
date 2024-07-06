"use client";

import dynamic from 'next/dynamic'
import { useEffect, useState, Component } from "react";
import { socket } from "@/socket.mjs";
import { NickName } from "@/app/nickNameForm";
import { Lobby } from "@/app/lobby";
import { CreateRoomForm } from "@/app/createRoomForm";

const GameContainer = dynamic(() => import('@/app/gameContainer').then(m => m.GameContainer), {
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
    setRenderLobby(true);
    setRenderCreateRoomForm(false);
  };

  const _onClickChangeNickName = () => {
    setRenderLobby(false);
    setRenderNickNameForm(true);
  };

  return (
    <div>
      <p>Status: {isConnected ? "connected" : "disconnected"}</p>
      {isConnected && renderNickNameForm && <NickName nickName={nickName} onClickCancel={_onClickCancelSetNickName} onSetNickName={_onSetNickName}></NickName>}
      {renderLobby && <Lobby nickName={nickName} onClickCreateRoom={_onClickCreateRoom} onClickChangeNickName={_onClickChangeNickName}></Lobby>}
      {renderCreateRoomForm && <CreateRoomForm onClickCancel={_onClickCancelCreateRoom} onCreateRoom={_onCreateRoom}></CreateRoomForm>}
      {renderGame && <GameContainer />}
    </div>
  );
}