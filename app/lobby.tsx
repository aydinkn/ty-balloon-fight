'use client';

import { FormEvent, useEffect, useRef, useState } from "react";
import { socket } from "@/socket.mjs";

export interface LobbyProps {
    nickName: string;
    onClickCreateRoom: () => void;
    onClickChangeNickName: () => void;
}

export function Lobby({ nickName, onClickCreateRoom, onClickChangeNickName }: LobbyProps) {
    const [rooms, setRooms] = useState<string[]>([]);

    useEffect(() => {
        if (socket.connected) {
            onConnect();
        }

        function onConnect() {
            socket.emit('getRoomList');
        }

        function roomListResult(data: { success: boolean, list: string[] }) {
            if (data.success) {
                setRooms(data.list);
            }
        };

        socket.on("connect", onConnect);
        socket.on('roomListResult', roomListResult);

        return () => {
            socket.off("connect", onConnect);
            socket.off('roomListResult', roomListResult);
        };
    }, []);

    const _onClickCreateRoom = () => {
        onClickCreateRoom();
    };

    const _onClickRefresh = () => {
        setRooms([]);
        socket.emit('getRoomList');
    };

    const _onClickChangeNickName = () => {
        onClickChangeNickName();
    };

    return (
        <div className="lobby">
            <h2>Lobby</h2>
            <div>
                <table>
                    <tbody>
                        <tr>
                            <th>Room Name</th>
                        </tr>
                        {rooms.map((room) => (
                            <tr key={room}>
                                <td>{room}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div>
                <button onClick={_onClickRefresh}>Refresh</button>
                <button>Join Room</button>
                <button onClick={_onClickCreateRoom}>Create Room</button>
                <button onClick={_onClickChangeNickName}>Change Nick Name</button>
            </div>
        </div>
    );
}