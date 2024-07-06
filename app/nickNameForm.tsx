'use client';

import { FormEvent, useEffect, useRef } from "react";
import { socket } from "@/socket.mjs";

export interface NickNameFormProps {
    nickName?: string;
    onClickCancel: () => void;
    onSetNickName: (nickName: string) => void;
}

export function NickName({ nickName, onClickCancel, onSetNickName }: NickNameFormProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        function setNickNameResult(data: { success: boolean }) {
            if (data.success) {
                onSetNickName(inputRef.current!.value);
            }
        }

        socket.on('setNickNameResult', setNickNameResult);

        return () => {
            socket.off('setNickNameResult', setNickNameResult);
        }
    }, [onSetNickName]);

    const _onClickCancel = () => {
        onClickCancel();
    };

    const _onSubmit = (event: FormEvent) => {
        event.preventDefault();
        event.stopPropagation();

        if (inputRef.current?.value) {
            socket.emit('setNickName', { nickName: inputRef.current.value });
        }
    }

    return (
        <form name="nick-name-form" onSubmit={_onSubmit}>
            <h2>Set your nick name</h2>
            <div>
                <input type="text" name="nickname" ref={inputRef} defaultValue={nickName} />
            </div>
            <div>
                {nickName && <button type="button" onClick={_onClickCancel}>Cancel</button>}
                <button type="submit">Ok</button>
            </div>
        </form>
    );
}