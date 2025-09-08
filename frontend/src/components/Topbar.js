import React, { useState, useEffect } from "react";
import "./Topbar.css";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();            // 현재 경로 정보
  const [activeItem, setActiveItem] = useState("업무");  // 기본 탭 설정
  const [currentProjectId, setCurrentProjectId] = useState(null);

  // 1) 프로젝트 정보 가져오기
  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        const res = await axios.get(
          "http://127.0.0.1:8000/api/users/projects/get/",
          { withCredentials: true }
        );
        if (res.data && res.data.project_id) {
          setCurrentProjectId(res.data.project_id);
        }
      } catch (error) {
        console.error("Topbar - 프로젝트 정보를 가져오는 데 실패했습니다.", error);
      }
    };
    fetchProjectData();
  }, []);

  // 2) location.pathname 에 따라 activeItem 자동 설정
  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/task")) {
      setActiveItem("업무");
    } else if (path.includes("/minutes")) {
      setActiveItem("회의록");
    } else if (path.includes("/calendar")) {
      setActiveItem("캘린더");
    } else if (path.includes("/file")) {
      setActiveItem("파일");
    } else if (path.includes("/activity")) {
      setActiveItem("활동기록");
    } else if (path.includes("/report")) {
      setActiveItem("보고서");
    } else {
      setActiveItem(null);
    }
  }, [location.pathname]);

  // 3) 프로젝트가 없으면 경고, 있으면 이동
  const safeNavigate = (pathBuilder) => {
    if (!currentProjectId) {
      alert("프로젝트가 선택되지 않았습니다.");
      return;
    }
    navigate(pathBuilder(currentProjectId));
  };

  return (
    <header className="Topbar_header">
      <div className="Topbar_header-icons">
        <div
          className={`Topbar_menu-item ${activeItem === "업무" ? "active" : ""}`}
          onClick={() => safeNavigate(id => `/project/${id}/task`)}
        >
          <img className="Topbar_homelogo" alt="homelogo" src="/homelogo.jpg" />
          <h1>업무</h1>
        </div>
        <div
          className={`Topbar_menu-item ${activeItem === "회의록" ? "active" : ""}`}
          onClick={() => safeNavigate(id => `/project/${id}/minutes`)}
        >
          <img className="Topbar_project" alt="project" src="/icons/project.svg" />
          <h1>회의록</h1>
        </div>
        <div
          className={`Topbar_menu-item ${activeItem === "캘린더" ? "active" : ""}`}
          onClick={() => safeNavigate(id => `/project/${id}/calendar`)}
        >
          <img className="Topbar_calendar" alt="calendar" src="/icons/calendar.svg" />
          <h1>캘린더</h1>
        </div>
        <div
          className={`Topbar_menu-item ${activeItem === "파일" ? "active" : ""}`}
          onClick={() => safeNavigate(id => `/project/${id}/file`)}
        >
          <img className="Topbar_file" alt="file" src="/icons/file.svg" />
          <h1>파일</h1>
        </div>
        <div
          className={`Topbar_menu-item ${activeItem === "활동기록" ? "active" : ""}`}
          onClick={() => safeNavigate(id => `/project/${id}/activity`)}
        >
          <img className="Topbar_list" alt="list" src="/icons/list.svg" />
          <h1>활동기록</h1>
        </div>
        <div
          className={`Topbar_menu-item ${activeItem === "보고서" ? "active" : ""}`}
          onClick={() => safeNavigate(id => `/project/${id}/report`)}
        >
          <img className="Topbar_report" alt="report" src="/icons/file2.svg" />
          <h1>보고서</h1>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
