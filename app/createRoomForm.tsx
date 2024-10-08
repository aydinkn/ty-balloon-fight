'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { socket } from "@/socket.mjs";

import styles from "@/app/createRoomForm.module.css";

export interface CreateRoomFormProps {
    onClickCancel: () => void;
    onCreateRoom: (roomName: string) => void;
}

export function CreateRoomForm({ onClickCancel, onCreateRoom }: CreateRoomFormProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState('');

    const createRoomResult = useCallback((data: { success: boolean, errorCode: string }) => {
        if (!data.success) {
            let errorMessage = 'Oda oluştururken bir hata oluştu.';

            if (data.errorCode === 'ROOM_ALREADY_EXISTS') {
                errorMessage = 'Aynı isimde bir oda mevcut. Lütfen başka bir oda ismi yazın.';
            }

            setError(errorMessage);
            return;
        }

        setError('');
        onCreateRoom(inputRef.current!.value);
    }, [onCreateRoom]);

    useEffect(() => {
        socket.on('createRoomResult', createRoomResult);

        return () => {
            socket.off('createRoomResult', createRoomResult);
        };
    }, [createRoomResult]);

    const _onClickCancel = () => {
        onClickCancel();
    };

    const _onSubmit = (event: FormEvent) => {
        event.preventDefault();
        event.stopPropagation();

        if (inputRef.current?.value) {
            socket.emit('createRoom', { roomName: inputRef.current.value });
        }
    }

    return (
        <form className={styles.createRoomForm} onSubmit={_onSubmit}>
            <h2>Create Room</h2>
            <div>
                <input type="text" name="roomname" ref={inputRef} placeholder="Enter room name" />
            </div>
            <div>
                <button type="button" onClick={_onClickCancel}>Cancel</button>
                <button type="submit">Create</button>
            </div>
            {error && <span>{error}</span>}
        </form>
    );
}