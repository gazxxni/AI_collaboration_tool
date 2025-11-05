// import React, { useState, useEffect, useRef } from "react";
// import ChatList from "./ChatList"; // 좌측 채팅방 목록 컴포넌트
// import "./Chat.css"; // CSS 파일 추가

// const Chat = ({ onClose }) => {
//   const [userId, setUserId] = useState(null);
//   const [selectedProjectId, setSelectedProjectId] = useState(null);
//   const [projectName, setProjectName] = useState(""); // ✅ 프로젝트 이름 상태 추가
//   const [messages, setMessages] = useState([]);
//   const [message, setMessage] = useState("");
//   const [socket, setSocket] = useState(null);
//   const chatMessagesRef = useRef(null); // ✅ 스크롤 조작을 위한 ref

//    // ✅ 시간 포맷 변환 함수 (오전/오후 + 시간:분 형식)
//    const formatTime = (timestamp) => {
//     // ✅ `timestamp`가 이미 Date 객체인지 확인 후 변환
//     const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
//     // ✅ 유효하지 않은 날짜라면 현재 시간 사용
//     if (isNaN(date.getTime())) return new Date().toLocaleTimeString("ko-KR", { hour: "numeric", minute: "numeric", hour12: true });
  
//     return date.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "numeric", hour12: true });
//   };
  
  
  

//   // ✅ 날짜 구분선 함수
//   const shouldShowDate = (currentMessage, previousMessage) => {
//     if (!previousMessage) return true;
  
//     // ✅ `timestamp`가 이미 Date 객체인지 확인 후 변환
//     const currentTimestamp = currentMessage.timestamp instanceof Date ? currentMessage.timestamp : new Date(currentMessage.timestamp);
//     const previousTimestamp = previousMessage.timestamp instanceof Date ? previousMessage.timestamp : new Date(previousMessage.timestamp);
  
//     if (isNaN(currentTimestamp.getTime()) || isNaN(previousTimestamp.getTime())) {
//       console.warn("🚨 유효하지 않은 timestamp 감지!", currentMessage.timestamp, previousMessage.timestamp);
//       return false;
//     }
  
//     // ✅ YYYY-MM-DD 형식 비교
//     const currentDate = currentTimestamp.toLocaleDateString("ko-KR", {
//       year: "numeric",
//       month: "numeric",
//       day: "numeric",
//     });
  
//     const previousDate = previousTimestamp.toLocaleDateString("ko-KR", {
//       year: "numeric",
//       month: "numeric",
//       day: "numeric",
//     });
  
//     return currentDate !== previousDate;
//   };
  
  
  
  

//   // ✅ 로그인된 사용자 ID 가져오기
//   useEffect(() => {
//     fetch("http://127.0.0.1:8000/api/users/name/", { method: "GET", credentials: "include" })
//       .then((res) => res.json())
//       .then((data) => {
//         if (data.user_id) {
//           setUserId(parseInt(data.user_id));
//         }
//       })
//       .catch((err) => console.error("🚨 사용자 정보를 불러오지 못했습니다.", err));
//   }, []);

//    // ✅ 프로젝트 이름 가져오기
//    useEffect(() => {
//     if (!selectedProjectId) {
//       setProjectName("선택된 채팅방 없음");
//       return;
//     }

//     fetch(`http://127.0.0.1:8000/chat/api/project/${selectedProjectId}/name/`)
//       .then((res) => res.json())
//       .then((data) => {
//         if (data.project_name) {
//           setProjectName(data.project_name);
//         } else {
//           setProjectName("알 수 없는 프로젝트");
//         }
//       })
//       .catch((err) => {
//         console.error("🚨 프로젝트 이름을 불러오지 못했습니다.", err);
//         setProjectName("프로젝트 로드 실패");
//       });
//   }, [selectedProjectId]); // ✅ 프로젝트가 변경될 때마다 실행


//   // ✅ 선택한 프로젝트의 기존 메시지 불러오기
//   useEffect(() => {
//     if (!selectedProjectId || userId === null) return;
  
//     fetch(`http://127.0.0.1:8000/chat/api/project/${selectedProjectId}/messages/`)
//       .then((res) => res.json())
//       .then((data) => {
//         const formattedMessages = data.messages.map((msg) => {
//           console.log("📢 [FETCH] 메시지 타임스탬프 원본:", msg.timestamp); // ✅ 여기에 추가
//           return {
//             ...msg,
//             isMine: msg.user_id === userId,
//           };
//         });
  
//         setMessages(formattedMessages);
//       })
//       .catch((err) => console.error("🚨 메시지를 불러오지 못했습니다.", err));
//   }, [selectedProjectId, userId]);
  


//   // ✅ WebSocket 연결 관리
//   useEffect(() => {
//     if (!selectedProjectId) return;
  
//     if (socket) {
//       socket.close();
//     }
  
//     const newSocket = new WebSocket(`ws://localhost:8000/chat/ws/chat/${selectedProjectId}/`);
  
//     newSocket.onopen = () => console.log("✅ WebSocket 연결 성공!");
//     newSocket.onerror = (error) => console.error("🚨 WebSocket 오류 발생:", error);
//     newSocket.onclose = () => console.log("❌ WebSocket 연결이 닫혔습니다.");
  
//     newSocket.onmessage = (event) => {
//       const data = JSON.parse(event.data);
//       console.log("📩 받은 메시지:", data);
    
//       setMessages((prev) => {
//         // ✅ 중복 메시지 방지 (단, message_id가 있는 경우만)
//         if (data.message_id && prev.some((msg) => msg.message_id === data.message_id)) {
//           return prev;
//         }
    
//         return [...prev, { ...data, isMine: data.user_id === userId }];
//       });
//     };
    
  
//     setSocket(newSocket);
  
//     return () => {
//       if (newSocket) newSocket.close();
//     };
//   }, [selectedProjectId]);
  
  
  
//   //시간 변환함수
//   const parseTimestamp = (timestamp) => {
//     if (!timestamp) return new Date(); // ✅ 유효하지 않은 경우 현재 시간 사용
  
//     // ✅ 오전/오후 형식인지 확인
//     const amPmMatch = timestamp.match(/(오전|오후) (\d+):(\d+)/);
//     if (amPmMatch) {
//       let hour = parseInt(amPmMatch[2], 10);
//       const minute = amPmMatch[3];
  
//       if (amPmMatch[1] === "오후" && hour !== 12) {
//         hour += 12;
//       } else if (amPmMatch[1] === "오전" && hour === 12) {
//         hour = 0; // 오전 12시는 00:00으로 변환
//       }
  
//       const now = new Date();
//       const formattedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
  
//       if (!isNaN(formattedDate.getTime())) {
//         return formattedDate;
//       }
//     }
  
//     // ✅ 기존 MM/DD HH:mm 형식 처리
//     const parts = timestamp.match(/(\d+)\/(\d+) (\d+):(\d+)/);
//     if (parts) {
//       const month = parts[1].padStart(2, '0');
//       const day = parts[2].padStart(2, '0');
//       const hour = parts[3].padStart(2, '0');
//       const minute = parts[4].padStart(2, '0');
  
//       const year = new Date().getFullYear();
//       const formattedDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00+09:00`);
  
//       if (!isNaN(formattedDate.getTime())) {
//         return formattedDate;
//       }
//     }
  
//     console.warn("🚨 알 수 없는 타임스탬프 형식:", timestamp);
//     return new Date();
//   };
  
  
//   // ✅ 메시지 전송
//   const sendMessage = () => {
//     if (!socket || socket.readyState !== WebSocket.OPEN) {
//       console.error("🚨 WebSocket이 열려 있지 않습니다!");
//       return;
//     }
  
//     if (!message.trim()) return;
  
//     const timestamp = new Date().toISOString(); // ✅ ISO 형식 변환
//     const messageData = { 
//       message, 
//       user_id: userId, 
//       timestamp, 
//       message_id: Date.now() // ✅ 임시 ID
//     };
  
//     console.log("📤 서버로 전송할 메시지:", JSON.stringify(messageData));
  
//     // ✅ 메시지를 내 화면에서 추가하지 않고 WebSocket을 통해 받은 후 추가
//     socket.send(JSON.stringify(messageData));
//     setMessage(""); // ✅ 입력창 초기화
//   };
  
  
  

  
//   // ✅ 메시지가 추가될 때마다 스크롤을 맨 아래로 이동
//   useEffect(() => {
//     if (chatMessagesRef.current) {
//       chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
//     }
//   }, [messages]);



  
  
  
  
//   return (
//     <div className="Invite_overlay">
//       <div className="Invite_modal">
//         <button className="Invite_close_btn" onClick={onClose}>✖</button>
//         <div className="Invite_app">
//           <div className="Invite_page">
//             <div className="Chat_page2">
//               <div className="chat-container">
                

//                 {/* ✅ 우측: 선택한 채팅방 메시지 화면 */}
//                 <div className="chat-box">
//                   <div className="chat-header">
//                     <h3>🔔{projectName}</h3> {/* ✅ 프로젝트 이름 표시 */}
//                 </div>
//                 <div className="chat-messages" ref={chatMessagesRef}>
//                   {messages.map((msg, index) => {
//                     const previousMessage = index > 0 ? messages[index - 1] : null;
//                     const showDate = shouldShowDate(msg, previousMessage);
//                     return (
//                       <React.Fragment key={msg.message_id}>
//                         {/* ✅ 날짜 구분선 추가 */}
//                         {showDate && (
//                           <div className="chat-date-divider">
//                             {new Date(msg.timestamp).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
//                           </div>
//                         )}

//                         <div className={`chat-message ${msg.isMine ? "mine" : "other"}`}>
//                           {!msg.isMine && <div className="chat-username">{msg.username}</div>}
//                           <div className="chat-bubble">
//                             {msg.message}
//                           </div>
//                           <span className="chat-timestamp">{formatTime(msg.timestamp)}</span>
//                         </div>
//                       </React.Fragment>
//                     );
//                   })}
//                 </div>
//                   {/* ✅ 메시지 입력창 */}
//                   <div className="chat-input">
//                     <input type="text"
//                     value={message}
//                     onChange={(e) => setMessage(e.target.value)}
//                     onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
//                     <button onClick={sendMessage}>전송</button>
//                   </div>
                  
//                 </div>
//                 {/* ✅ 우측: 채팅방 목록 */}
//                 <ChatList setSelectedProjectId={setSelectedProjectId} selectedProjectId={selectedProjectId} />
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Chat;

import React, { useState, useEffect, useRef } from "react";
import ChatList from "./ChatList"; // 좌측 채팅방 목록 컴포넌트
import "./Chat.css"; // CSS 파일 추가

const Chat = ({ onClose, initTab = "project", initRoomId = null, initPartner = "" }) => {
  const [userId, setUserId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectName, setProjectName] = useState(""); // ✅ 프로젝트 이름 상태 추가
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [socket, setSocket] = useState(null);
  const chatMessagesRef = useRef(null); // ✅ 스크롤 조작을 위한 ref

  // ★ 추가: 개인 채팅(DM) 탭 관련 상태
  const [activeTab, setActiveTab] = useState("project");      // "project" or "dm"
  const [selectedDmRoomId, setSelectedDmRoomId] = useState(null);
  const [dmPartnerName, setDmPartnerName] = useState("");     // DM 상대 이름
  const isComposing = (e) =>
    e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229;

/* 이거 뭐지... 왜 넣은 거지...?*/
  // useEffect(() => {
  //   if (userId) return;                                   // 이미 값 있으면 건너뜀
  //   fetch("http://127.0.0.1:8000/api/users/name/", {
  //     method: "GET",
  //     credentials: "include",
  //   })
  //     .then(res => res.json())
  //     .then(d => setUserId(parseInt(d.user_id)))
  //     .catch(err => console.error("🚨 사용자 ID 로드 실패:", err));
  // }, [userId]);


  useEffect(() => {
    if (initTab === "dm" && initRoomId) {
      setActiveTab("dm");
      setSelectedDmRoomId(initRoomId);
      if (initPartner) setDmPartnerName(initPartner);
    }
    if (initTab === "project" && initRoomId) {
      setActiveTab("project");
      setSelectedProjectId(initRoomId);
    }
  }, []);   // ← 처음 한 번만 실행


  // ✅ 시간 포맷 변환 함수 (오전/오후 + 시간:분 형식)
  const formatTime = (timestamp) => {
    // ✅ `timestamp`가 이미 Date 객체인지 확인 후 변환
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  
    // ✅ 유효하지 않은 날짜라면 현재 시간 사용
    if (isNaN(date.getTime())) {
      return new Date().toLocaleTimeString("ko-KR", {
        hour: "numeric",
        minute: "numeric",
        hour12: true
      });
    }
  
    return date.toLocaleTimeString("ko-KR", {
      hour: "numeric",
      minute: "numeric",
      hour12: true
    });
  };
  
  // ✅ 날짜 구분선 함수
  const shouldShowDate = (currentMessage, previousMessage) => {
    if (!previousMessage) return true;
  
    // ✅ `timestamp`가 이미 Date 객체인지 확인 후 변환
    const currentTimestamp = currentMessage.timestamp instanceof Date
      ? currentMessage.timestamp
      : new Date(currentMessage.timestamp);
    const previousTimestamp = previousMessage.timestamp instanceof Date
      ? previousMessage.timestamp
      : new Date(previousMessage.timestamp);
  
    if (isNaN(currentTimestamp.getTime()) || isNaN(previousTimestamp.getTime())) {
      console.warn("🚨 유효하지 않은 timestamp 감지!", currentMessage.timestamp, previousMessage.timestamp);
      return false;
    }
  
    // ✅ YYYY-MM-DD 형식 비교
    const currentDate = currentTimestamp.toLocaleDateString("ko-KR", {
      year: "numeric", month: "numeric", day: "numeric"
    });
    const previousDate = previousTimestamp.toLocaleDateString("ko-KR", {
      year: "numeric", month: "numeric", day: "numeric"
    });
  
    return currentDate !== previousDate;
  };
  
  // ✅ 로그인된 사용자 ID 가져오기
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/users/name/", {
      method: "GET", credentials: "include"
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user_id) {
          setUserId(parseInt(data.user_id));
        }
      })
      .catch((err) => console.error("🚨 사용자 정보를 불러오지 못했습니다.", err));
  }, []);
  
  // ✅ 프로젝트 이름 or DM 상대 이름 가져오기
  useEffect(() => {
    if (activeTab !== "project") {
      // DM 탭일 때 프로젝트 이름 로직 스킵
      return;
    }
    if (!selectedProjectId && !selectedDmRoomId) {
      setProjectName("선택된 채팅방 없음");
      setDmPartnerName("선택된 채팅방 없음")
      return;
    }
    fetch(`http://127.0.0.1:8000/chat/api/project/${selectedProjectId}/name/`)
      .then((res) => res.json())
      .then((data) => {
        if (data.project_name) {
          setProjectName(data.project_name);
        } else {
          setProjectName("알 수 없는 프로젝트");
        }
      })
      .catch((err) => {
        console.error("🚨 프로젝트 이름을 불러오지 못했습니다.", err);
        setProjectName("프로젝트 로드 실패");
      });
  }, [selectedProjectId, activeTab]); // ✅ activeTab 추가
  
  // ✅ 선택한 프로젝트 또는 DM 방의 기존 메시지 불러오기
  useEffect(() => {
    if (userId === null) return;
  
    if (activeTab === "project") {
      if (!selectedProjectId) return;
      fetch(`http://127.0.0.1:8000/chat/api/project/${selectedProjectId}/messages/`)
        .then((res) => res.json())
        .then((data) => {
          const formattedMessages = data.messages;
          // const formattedMessages = data.messages.map((msg) => ({
          //   ...msg,
          //   isMine: msg.user_id === userId
          // }));
          setMessages(formattedMessages);
        })
        .catch((err) => console.error("🚨 메시지를 불러오지 못했습니다.", err));
    } else {
      // DM 메시지 로드
      if (!selectedDmRoomId) return;
      fetch(`http://127.0.0.1:8000/chat/api/dm_rooms/${selectedDmRoomId}/messages/`)
        .then((res) => res.json())
        .then((data) => {
          const formattedMessages = data.messages.map((msg) => ({
            ...msg,
            isMine: msg.user_id === userId
          }));
          setMessages(formattedMessages);
        })
        .catch((err) => console.error("🚨 DM 메시지를 불러오지 못했습니다.", err));
    }
  }, [selectedProjectId, selectedDmRoomId, userId, activeTab]); // ✅ selectedDmRoomId, activeTab 추가
  
  // ✅ WebSocket 연결 관리 (프로젝트 / DM 분기)
  useEffect(() => {
    if (socket) {
      socket.close();
    }
  
    let wsUrl = null;
    if (activeTab === "project") {
      if (!selectedProjectId) return;
      wsUrl = `ws://localhost:8000/chat/ws/chat/${selectedProjectId}/`;
    } else {
      if (!selectedDmRoomId) return;
      wsUrl = `ws://localhost:8000/chat/ws/chat/dm/${selectedDmRoomId}/`;
    }
  
    const newSocket = new WebSocket(wsUrl);
    newSocket.onopen = () => console.log("✅ WebSocket 연결 성공!", wsUrl);
    newSocket.onerror = (error) => console.error("🚨 WebSocket 오류 발생:", error);
    newSocket.onclose = () => console.log("❌ WebSocket 연결이 닫혔습니다.");
  
    newSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => {
        // ✅ 중복 메시지 방지
        if (data.message_id && prev.some((msg) => msg.message_id === data.message_id)) {
          return prev;
        }
        // return [...prev, { ...data, isMine: data.user_id === userId }];
        return [...prev, data];
      });
    };
  
    setSocket(newSocket);
    return () => {
      if (newSocket) newSocket.close();
    };
  }, [selectedProjectId, selectedDmRoomId, activeTab]); // ✅ selectedDmRoomId, activeTab 추가
  
  // 시간 파싱 함수 (생략: 기존 parseTimestamp 로직)
  const parseTimestamp = (timestamp) => {
    if (!timestamp) return new Date();
    const amPmMatch = timestamp.match(/(오전|오후) (\d+):(\d+)/);
    if (amPmMatch) {
      let hour = parseInt(amPmMatch[2], 10);
      const minute = amPmMatch[3];
      if (amPmMatch[1] === "오후" && hour !== 12) hour += 12;
      else if (amPmMatch[1] === "오전" && hour === 12) hour = 0;
      const now = new Date();
      const formattedDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour,
        minute
      );
      if (!isNaN(formattedDate.getTime())) return formattedDate;
    }
    const parts = timestamp.match(/(\d+)\/(\d+) (\d+):(\d+)/);
    if (parts) {
      const month = parts[1].padStart(2, "0");
      const day = parts[2].padStart(2, "0");
      const hour = parts[3].padStart(2, "0");
      const minute = parts[4].padStart(2, "0");
      const year = new Date().getFullYear();
      const formattedDate = new Date(
        `${year}-${month}-${day}T${hour}:${minute}:00+09:00`
      );
      if (!isNaN(formattedDate.getTime())) return formattedDate;
    }
    console.warn("🚨 알 수 없는 타임스탬프 형식:", timestamp);
    return new Date();
  };
  
  // ✅ 메시지 전송
  const sendMessage = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error("🚨 WebSocket이 열려 있지 않습니다!");
      return;
    }
    if (!message.trim()) return;
  
    const timestamp = new Date().toISOString();
    const messageData = {
      message,
      user_id: userId,
      timestamp,
      message_id: Date.now() // 임시 ID
    };
  
    console.log("📤 서버로 전송할 메시지:", JSON.stringify(messageData));
    socket.send(JSON.stringify(messageData));
    setMessage("");
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  
  // ✅ 메시지가 추가될 때마다 스크롤을 맨 아래로 이동
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);
  
  return (
    <div className="Invite_overlay" onClick={onClose}>
      <div className="Invite_modal" onClick={(e) => e.stopPropagation()} >
        <button className="Invite_close_btn" onClick={onClose}>
          ✖
        </button>
        <div className="Invite_app">
          <div className="Invite_page">
            <div className="Chat_page2">
              <div className="chat-container">

                {/* ✅ 좌측: 선택한 채팅방 메시지 화면 */}
                <div className="chat-box">
                  <div className="chat-header">
                    <h3>
                      🔔{" "}
                      {activeTab === "project" ? projectName : dmPartnerName}
                    </h3>
                  </div>

                  <div className="chat-messages" ref={chatMessagesRef}>
                    {messages.map((msg, index) => {
                      const prev = index > 0 ? messages[index - 1] : null;
                      const showDate = shouldShowDate(msg, prev);
                      return (
                        <React.Fragment key={msg.message_id || index}>
                          {showDate && (
                            <div className="chat-date-divider">
                              {new Date(msg.timestamp).toLocaleDateString("ko-KR", {
                                month: "numeric",
                                day: "numeric",
                              })}
                            </div>
                          )}
                          {/* <div className={`chat-message ${msg.isMine ? "mine" : "other"}`}>
                            {!msg.isMine && <div className="chat-username">{msg.username}</div>} */}
                          <div className={`chat-message ${msg.user_id === userId ? "mine" : "other"}`}>
                            {msg.user_id !== userId && <div className="chat-username">{msg.username}</div>}
                            <div className="chat-bubble">{msg.message}</div>
                            <span className="chat-timestamp">{formatTime(msg.timestamp)}</span>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* ✅ 메시지 입력창 */}
                  <div className="chat-input">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        // Shift+Enter는 줄바꿈으로 남겨두고 싶으면 아래 조건 유지
                        if (e.key === "Enter" && !e.shiftKey && !isComposing(e)) {
                          e.preventDefault(); // 브라우저 기본 제출/클릭 연쇄 방지
                          sendMessage();
                        }
                      }}
                    />
                    <button type="button" onClick={sendMessage}>전송</button>
                  </div>
                </div>

                {/* 우측: 프로젝트/DM 탭 구분 목록 */}
                <ChatList
                  setSelectedProjectId={setSelectedProjectId}
                  selectedProjectId={selectedProjectId}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  setSelectedDmRoomId={setSelectedDmRoomId}
                  setDmPartnerName={setDmPartnerName}
                  selectedDmRoomId={selectedDmRoomId}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
