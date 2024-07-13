'use client';

import { useEffect, useState, useCallback } from "react";
import { socket } from "@/socket.mjs";
import styles from "@/app/lobby.module.css";

export interface LobbyProps {
    onClickCreateRoom: () => void;
    onClickChangeNickName: () => void;
    onJoinRoom: (roomName: string) => void;
}

export function Lobby({ onClickCreateRoom, onClickChangeNickName, onJoinRoom }: LobbyProps) {
    const [rooms, setRooms] = useState<string[]>([]);
    const [selectedRoom, setSelectedRoom] = useState('');
    const [error, setError] = useState('');

    const roomListResult = useCallback(({ success, list }: { success: boolean, list: string[] }) => {
        if (success) {
            setRooms(list);

            if (!list.some(room => selectedRoom === room)) {
                setSelectedRoom('');
            };
        }
    }, [selectedRoom]);

    const joinRoomResult = useCallback(({ success, roomName, errorCode }: { success: boolean, roomName: string, errorCode: string }) => {
        if (!success) {
            let errorMessage = 'Odaya join olurken bir hata oluştu.';

            const errorMessages: { [key: string]: string } = {
                'ROOM_NOT_FOUND': 'Oda bulunamadı. Başka bir oda seçin.',
                'ALREADY_JOINED_TO_ROOM': 'Zaten odadasınız. Sayfayı yenileyip tekrar deneyin.'
            };

            setError(errorMessages[errorCode] || errorMessage);
            return;
        }

        setError('');
        onJoinRoom(roomName);
    }, [onJoinRoom]);

    useEffect(() => {
        if (socket.connected) {
            onConnect();
        }

        function onConnect() {
            socket.emit('getRoomList');
        }

        socket.on("connect", onConnect);
        socket.on('roomListResult', roomListResult);
        socket.on('joinRoomResult', joinRoomResult);

        return () => {
            socket.off("connect", onConnect);
            socket.off('roomListResult', roomListResult);
            socket.off('joinRoomResult', joinRoomResult);
        };
    }, [roomListResult, joinRoomResult]);

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

    const _onClickRoomRow = (roomName: string) => {
        setSelectedRoom(roomName);
    };

    const _onClickJoinRoom = () => {
        if (selectedRoom) {
            socket.emit('joinRoom', { roomName: selectedRoom });
        }
    };

    return (
        <div className="lobby">
            <h2>Lobby</h2>
            <div>
                <table className={styles.room_select}>
                    <tbody>
                        <tr>
                            <th>Room Name</th>
                        </tr>
                        {rooms.map((room) => (
                            <tr key={room} onClick={() => _onClickRoomRow(room)} className={selectedRoom === room ? styles.selected : ''}>
                                <td>{room}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div>
                <button onClick={_onClickRefresh}>Refresh</button>
                <button disabled={!selectedRoom} onClick={_onClickJoinRoom}>Join Room</button>
                <button onClick={_onClickCreateRoom}>Create Room</button>
                <button onClick={_onClickChangeNickName}>Change Nick Name</button>
            </div>
            {error && <span>{error}</span>}
        </div>
    );
}