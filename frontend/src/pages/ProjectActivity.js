/* eslint-disable */
import React, { useState, useEffect } from "react";
import axios from "axios";
import Topbar from "../components/Topbar";
import Topbarst from "../components/Topbarst";
import "./ProjectActivity.css";
import { useParams } from "react-router-dom";

function ProjectActivity() {
  const { projectId }   = useParams();
  const [search, setSearch] = useState("");
  const [logs,   setLogs]   = useState([]);

  /* ────────────────────────────────
     [task_id=2266] 업무명  업무가 삭제됨
     [task_id=2267] 업무명  업무 생성
     문자열을 파싱해 id·업무명·verb(꼬리표) 반환
  ────────────────────────────────*/
  const parseSnapshot = (content = "") => {
    const m = content.match(
      /^\[task_id=(\d+)\]\s*(.*?)\s*(업무가\s*삭제됨|업무\s*생성)?$/u
    );
    if (!m) return { id: null, name: content.trim(), verb: "" };
    return { id: m[1], name: m[2].trim(), verb: (m[3] || "").trim() };
  };

  /* ────────────────────────────────
     1) 프로젝트 로그 가져오기
  ────────────────────────────────*/
  useEffect(() => {
    axios
      .get(`http://127.0.0.1:8000/api/projects/${projectId}/logs/`)
      .then((res) => setLogs(res.data))
      .catch((err) => console.error("로그 불러오기 실패:", err));
  }, [projectId]);

  /* ────────────────────────────────
     2) 라벨 색상 매핑
  ────────────────────────────────*/
  const labelClass = (action) =>
    ({
      "댓글 등록":       "action-댓글등록",
      "업무 상태 변경":   "action-업무상태변경",
      "담당자 변경":     "action-담당자변경",
      "상위 업무 생성":   "action-업무생성",
      "하위 업무 생성":   "action-업무생성",
      "상위 업무 삭제":   "action-업무삭제",
      "하위 업무 삭제":    "action-업무삭제",
      "파일 업로드":     "action-파일업로드",
    }[action] || "");

  /* ────────────────────────────────
     3) 검색(작성자)
  ────────────────────────────────*/
  const shown = logs.filter((l) =>
    (l.user_name || l.user || "").toLowerCase().includes(search.toLowerCase())
  );

  /* ────────────────────────────────
     4) 렌더링
  ────────────────────────────────*/
  return (
    <div className="ProjectActivity_wrapper">
      <Topbarst />
      <Topbar />

      <div className="ProjectActivity_main">
        {/* 검색창 */}
        <div className="ProjectActivity_content">
          <div className="ProjectActivity_searchRow">
            <input
              type="text"
              className="ActivitySearchInput"
              placeholder="작성자 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* 로그 목록 */}
          <div className="ActivityList">
            {shown.map((log, idx) => {
              /* 필드 정규화: 백엔드에서 내려오는 키 이름 대응 */
              const userName    = log.user_name || log.user || "알 수 없음";
              const createdAt   = log.created_date || log.date;
              const taskObj     = log.task_name || log.task || null;

              /* 스냅샷 파싱 */
              const snap        = parseSnapshot(log.content || "");
              const taskName    = taskObj || snap.name;
              const taskIdTag   = snap.id ? ` #${snap.id}` : "";

              /* 내용(verb 없는 일반 로그는 task_id 부분 제거) */
              const bodyText =
                snap.verb ||
                log.content.replace(/^\[task_id=\d+\]\s*/u, "");

              return (
                <div className="ActivityItem" key={idx}>
                  <div className="ActivityAvatar">
                    <img src="/user_icon.png" alt="user" />
                  </div>

                  <div className="ActivityContent">
                    {/* 작성자 + 액션 */}
                    <p>
                      <strong>{userName}</strong> 님의&nbsp;
                      <span className={`action-label ${labelClass(log.action)}`}>
                        {log.action}
                      </span>
                    </p>

                    {/* 업무명 */}
                    <p className="ActivityTask">
                      업무명:&nbsp;<span>{taskName}</span>
                    </p>

                    {/* 내용 */}
                    <p className="ActivityDetail">
                      내용:&nbsp;<span>{bodyText}</span>
                    </p>

                    {/* 날짜 */}
                    <p className="ActivityDate">
                      {createdAt && new Date(createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectActivity;
