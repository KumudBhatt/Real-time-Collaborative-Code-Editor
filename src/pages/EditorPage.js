import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import { initSocket } from '../socket';
import axios from 'axios'; 
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';

const EditorPage = () => {
    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();
    const [clients, setClients] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [outputValue, setOutputValue] = useState('');
    const [language, setLanguage] = useState("cpp");
    const [code, setCode] = useState("");
    const handleInputChange = (e) => {
        setInputValue(e.target.value);
    };
    const handleRunCode = async () => {
        const payload = {
            language,
            code, 
          };
          try {
          const {data} = await axios.post("http://localhost:5000/run", payload);
          setOutputValue(data.output); // Assuming your backend returns 'output'
        } catch (error) {
          console.log(error.response);
          // Handle the error here, e.g., show an error message to the user
        }
  };
    // const handleRunCode = () => {
    //     // // Here you can process the inputValue and update the outputValue
    //     // // For example, send inputValue to a server to compile/run code
    //     // // and update outputValue with the result
    //     // console.log(inputValue);
    //     setOutputValue(`${code}`);
    // };
        
    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();
            socketRef.current.on('connect_error', (err) => handleErrors(err));
            socketRef.current.on('connect_failed', (err) => handleErrors(err));

            function handleErrors(e) {
                console.log('socket error', e);
                toast.error('Socket connection failed, try again later.');
                reactNavigator('/');
            }

            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,
            });

            // Listening for joined event
            socketRef.current.on(
                ACTIONS.JOINED,
                ({ clients, username, socketId }) => {
                    if (username !== location.state?.username) {
                        toast.success(`${username} joined the room.`);
                        console.log(`${username} joined`);
                    }
                    setClients(clients);
                    socketRef.current.emit(ACTIONS.SYNC_CODE, {
                        code: codeRef.current,
                        socketId,
                    });
                }
            );

            // Listening for disconnected
            socketRef.current.on(
                ACTIONS.DISCONNECTED,
                ({ socketId, username }) => {
                    toast.success(`${username} left the room.`);
                    setClients((prev) => {
                        return prev.filter(
                            (client) => client.socketId !== socketId
                        );
                    });
                }
            );
        };
        init();
        return () => {
            socketRef.current.disconnect();
            socketRef.current.off(ACTIONS.JOINED);
            socketRef.current.off(ACTIONS.DISCONNECTED);
        };
    }, []);

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
            console.error(err);
        }
    }

    function leaveRoom() {
        reactNavigator('/');
    }

    if (!location.state) {
        return <Navigate to="/" />;
    }

    return (
        <div className="mainWrap">
            <div className="aside">
                <div className="asideInner">
                    <div className="logo">
                        <img
                            className="logoImage"
                            src="/code-sync.png"
                            alt="logo"
                        />
                    </div>
                    <h3>Connected</h3>
                    <div className="clientsList">
                        {clients.map((client) => (
                            <Client
                                key={client.socketId}
                                username={client.username}
                            />
                        ))}
                    </div>
                </div>
                <button className="btn copyBtn" onClick={copyRoomId}>
                    Copy ROOM ID
                </button>
                <button className="btn leaveBtn" onClick={leaveRoom}>
                    Leave
                </button>
            </div>
            <div className="editorWrap">
                <div className='Lang'>
                    <label>Language : </label>
                    <select
                        value = {language}
                        onChange = {(e) => {
                            setLanguage(e.target.value);
                        }}
                    >
                        <option>C++</option>
                        <option>Python</option>
                    </select>
                </div>
                <Editor
                    socketRef={socketRef}
                    roomId={roomId}
                    onCodeChange={(newCode) => setCode(newCode)} // Update code state
                />
                <div className="compilerWrap">
                    <div className="input">
                        <span className='textField'>Input</span>
                        <textarea
                            className="textArea"
                            rows="3" 
                            cols="50"
                            value={inputValue}
                            onChange={handleInputChange}
                            placeholder="Enter input..."
                        />
                    </div>
                    <div className="output">
                        <span className='textField'>Output</span>
                        <textarea
                            className="textArea"
                            rows="3" 
                            cols="50"
                            value={outputValue}
                            readOnly
                            placeholder="Output will appear here..."
                        />
                    </div>
                    <button className="btn runBtn" onClick={handleRunCode}>
                        Run Code
                    </button>
                </div>
            </div>

        </div>
    );
};

export default EditorPage;
