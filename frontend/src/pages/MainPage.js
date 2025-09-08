import React, { useState, useEffect } from 'react';
import axios from "axios";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import "./MainPage.css";

// 아이콘 컴포넌트들
const LayoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="3" y1="9" x2="21" y2="9"></line>
    <line x1="9" y1="21" x2="9" y2="9"></line>
  </svg>
);

const CheckSquareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 11 12 14 22 4"></polyline>
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
  </svg>
);

const FolderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

const AlertCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const StarIcon = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "#fbbf24" : "none"} stroke={filled ? "#fbbf24" : "currentColor"} strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

// 날짜 포맷 통일을 위한 헬퍼 함수
const formatDate = (dateInput) => {
  const dateObj = new Date(dateInput);
  return dateObj
    .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\. /g, "-")
    .replace(/\./g, "");
};

// 오늘 날짜 가져오기
const getToday = () => {
  return formatDate(new Date());
};

// 날짜 차이 계산 함수
const getDaysDifference = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000;
  const firstDate = new Date(date1);
  const secondDate = new Date(date2);
  return Math.round((firstDate - secondDate) / oneDay);
};

function MainPage() {
  const [userName, setUserName] = useState(""); 
  const [userId, setUserId] = useState(null);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  
  // 프로젝트 관련
  const [projects, setProjects] = useState([]);
  const [projectLogs, setProjectLogs] = useState([]);
  
  // 캘린더 관련
  const [date, setDate] = useState(new Date());
  const [activeStartDate, setActiveStartDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [teamSchedules, setTeamSchedules] = useState([]);
  
  // 통계 관련
  const [stats, setStats] = useState({
    totalProjects: 0,
    myTasks: 0,
    completedTasks: 0,
    urgentTasks: 0
  });

  // 사용자 데이터 가져오기
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/api/users/name/", { withCredentials: true });
        setUserName(response.data.name);
        setUserId(response.data.user_id);
      } catch (error) {
        console.error("사용자 정보를 가져오는 데 실패했습니다:", error);
      }
    };
    fetchUserData();

    // 시간 업데이트
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 프로젝트 데이터 가져오기
  useEffect(() => {
    const fetchProjects = async () => {
      if (!userId) return;
      
      try {
        const response = await axios.get(
          `http://127.0.0.1:8000/api/user/${userId}/projects/`,
          { withCredentials: true }
        );
        if (response.data.projects) {
          const projectsWithFavorite = response.data.projects.map(p => ({
            ...p,
            is_favorite: p.is_favorite ?? false,
          }));
          const projectsWithProgress = await Promise.all(
            projectsWithFavorite.map(async (p) => {
              try {
                const progressResponse = await axios.get(
                  `http://127.0.0.1:8000/api/user/${userId}/projects/${p.project_id}/progress/`,
                  { withCredentials: true }
                );
                return { ...p, progress: progressResponse.data.progress };
              } catch (error) {
                console.error(`Error fetching progress for project ${p.project_id}`, error);
                return { ...p, progress: 0 };
              }
            })
          );
          setProjects(projectsWithProgress);
          
          // 통계 업데이트
          setStats(prev => ({
            ...prev,
            totalProjects: projectsWithProgress.length
          }));
          
          // 첫 번째 프로젝트의 로그 가져오기
          if (projectsWithProgress.length > 0) {
            fetchProjectLogs(projectsWithProgress[0].project_id);
          }
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };

    fetchProjects();
  }, [userId]);

  // 프로젝트별 로그 가져오기
  const fetchProjectLogs = async (projectId) => {
    try {
      const response = await axios.get(
        `http://127.0.0.1:8000/api/projects/${projectId}/logs/`,
        { withCredentials: true }
      );
      setProjectLogs(response.data);
    } catch (error) {
      console.error('Error fetching project logs:', error);
    }
  };

  // 개인 일정 데이터 가져오기
  useEffect(() => {
    fetch("http://127.0.0.1:8000/schedule/list/", {
      credentials: 'include'
    })
      .then(response => response.json())
      .then(data => setSchedules(data))
      .catch(error => console.error("Error fetching schedule:", error));
  }, []);

  // 팀 일정 데이터 가져오기
  useEffect(() => {
    axios.get(`http://127.0.0.1:8000/schedule/api/tasks/`, { withCredentials: true })
      .then(response => {
        setTeamSchedules(response.data);
      })
      .catch(error => console.error("Error fetching team schedule:", error));
  }, []);

// MainPage.js의 useState 부분에 추가
const [showModal, setShowModal] = useState(false);
const [modalData, setModalData] = useState({ type: '', tasks: [], title: '' });

// useEffect들 다음에 추가
// 모달 데이터 가져오기 함수
const fetchTaskDetails = async (type) => {
  try {
    const response = await axios.get(
      `http://127.0.0.1:8000/api/users/task-details/?type=${type}`,
      { withCredentials: true }
    );
    
    const titles = {
      'my': '내가 맡은 업무',
      'completed': '완료한 업무',
      'urgent': '긴급 업무'
    };
    
    setModalData({
      type: type,
      tasks: response.data.tasks,
      title: titles[type],
      total: response.data.total
    });
    setShowModal(true);
  } catch (error) {
    console.error('Error fetching task details:', error);
  }
};

// 모달 닫기 함수
const closeModal = () => {
  setShowModal(false);
  setModalData({ type: '', tasks: [], title: '' });
};

// 날짜 포맷 함수
const formatModalDate = (dateString) => {
  if (!dateString) return "날짜 없음";
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

// D-day 계산 함수
const calculateDDay = (endDate) => {
  if (!endDate) return "";
  const today = new Date();
  const end = new Date(endDate);
  const diffTime = end - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return `D+${Math.abs(diffDays)}`;
  if (diffDays === 0) return "D-Day";
  return `D-${diffDays}`;
};


useEffect(() => {
  const fetchTaskStats = async () => {
    if (!userId) return;
    
    try {
      const response = await axios.get(
        "http://127.0.0.1:8000/api/users/task-stats/",
        { withCredentials: true }
      );
      
      setStats(prev => ({
        ...prev,
        myTasks: response.data.my_tasks,
        completedTasks: response.data.completed_tasks,
        urgentTasks: response.data.urgent_tasks
      }));
    } catch (error) {
      console.error('Error fetching task stats:', error);
    }
  };

  fetchTaskStats();
}, [userId]);

  // 즐겨찾기 토글
  const handleFavoriteToggle = async (projectId, isFavorite) => {
    const effectiveIsFavorite = isFavorite ?? false;
    if (!effectiveIsFavorite) {
      const currentFavorites = projects.filter(p => p.is_favorite);
      if (currentFavorites.length >= 3) {
        alert('최대 3개의 즐겨찾기를 등록할 수 있습니다.');
        return;
      }
    }

    const url = `http://127.0.0.1:8000/api/user/${userId}/projects/${projectId}/favorite/`;
    const method = effectiveIsFavorite ? 'delete' : 'post';

    try {
      await axios({
        method: method,
        url: url,
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.project_id === projectId
            ? { ...project, is_favorite: !effectiveIsFavorite }
            : project
        )
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // 프로젝트 선택 시 로그도 가져오기
  const handleProjectSelect = (projectId) => {
    // 이미 선택된 프로젝트를 다시 클릭하면 선택 해제
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null);
    } else {
      setSelectedProjectId(projectId);
      fetchProjectLogs(projectId);
    }
  };

  // 프로젝트 정렬
  const nonFavoriteProjects = projects
    .filter(p => !p.is_favorite)
    .sort((a, b) => {
      const aStartsWithDigit = /^\d/.test(a.project_name);
      const bStartsWithDigit = /^\d/.test(b.project_name);
      if (aStartsWithDigit && !bStartsWithDigit) return 1;
      if (!aStartsWithDigit && bStartsWithDigit) return -1;
      return a.project_name.localeCompare(b.project_name, 'ko', { sensitivity: 'base' });
    });
  const favoriteProjects = projects.filter(p => p.is_favorite);
  const orderedProjects = [...favoriteProjects, ...nonFavoriteProjects];

  const nameInitials = userName.slice(-2);
  const selectedProject = projects.find(p => p.project_id === selectedProjectId);

  // userId를 기반으로 내 일정 필터링
  const mySchedules = userId 
    ? schedules.filter(schedule => String(schedule.user) === String(userId))
    : [];

  // 오늘 일정과 선택한 날짜 일정 가져오기
  const today = getToday();
  const todaySchedules = mySchedules.filter(schedule => schedule.start_time === today);
  const todayTeamSchedules = teamSchedules.filter(schedule => formatDate(schedule.end_date_due_date) === today);
  
  const selectedDateSchedules = selectedDate ? mySchedules.filter(schedule => schedule.start_time === selectedDate) : [];
  const selectedDateTeamSchedules = selectedDate ? teamSchedules.filter(schedule => formatDate(schedule.end_date_due_date) === selectedDate) : [];

  // 로그 파싱 함수
  const parseSnapshot = (content = "") => {
    const m = content.match(
      /^\[task_id=(\d+)\]\s*(.*?)\s*(업무가\s*삭제됨|업무\s*생성)?$/u
    );
    if (!m) return { id: null, name: content.trim(), verb: "" };
    return { id: m[1], name: m[2].trim(), verb: (m[3] || "").trim() };
  };

  // 라벨 색상 매핑
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

  return (
    <div className="main-container">
      {/* Main Dashboard */}
      <div className="dashboard-container">
        <div className="dashboard-content">
          {/* Top Stats Row */}
          <div className="stats-grid">
            {/* // 기존 stats-grid 부분을 이렇게 수정 */}
            <div className="stats-grid">
              <div className="stat-card clickable" onClick={() => fetchTaskDetails('my')}>
                <div className="stat-header">
                  <div className="stat-icon blue-bg">
                    <FolderIcon />
                  </div>
                  <span className="stat-badge blue">프로젝트</span>
                </div>
                <h3 className="stat-number">{stats.totalProjects}</h3>
                <p className="stat-label">진행중인 프로젝트</p>
              </div>

              <div className="stat-card clickable" onClick={() => fetchTaskDetails('my')}>
                <div className="stat-header">
                  <div className="stat-icon purple-bg">
                    <LayoutIcon />
                  </div>
                  <span className="stat-badge purple">업무</span>
                </div>
                <h3 className="stat-number">{stats.myTasks}</h3>
                <p className="stat-label">내가 맡은 업무</p>
              </div>

              <div className="stat-card clickable" onClick={() => fetchTaskDetails('completed')}>
                <div className="stat-header">
                  <div className="stat-icon green-bg">
                    <CheckSquareIcon />
                  </div>
                  <span className="stat-badge green">완료</span>
                </div>
                <h3 className="stat-number">{stats.completedTasks}</h3>
                <p className="stat-label">완료한 업무</p>
              </div>

              <div className="stat-card clickable" onClick={() => fetchTaskDetails('urgent')}>
                <div className="stat-header">
                  <div className="stat-icon red-bg">
                    <AlertCircleIcon />
                  </div>
                  <span className="stat-badge red pulse">긴급</span>
                </div>
                <h3 className="stat-number">{stats.urgentTasks}</h3>
                <p className="stat-label">긴급 사항</p>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="content-grid">
            {/* Projects Section */}
            <div className="projects-section">
              <div className="section-card">
                <div className="section-header">
                  <h2 className="section-title">프로젝트 현황</h2>
                </div>
                
                {userId ? (
                  <div className="projects-list">
                    {orderedProjects.map(project => (
                      <div 
                        key={project.project_id}
                        onClick={() => handleProjectSelect(project.project_id)}
                        className={`project-card ${selectedProjectId === project.project_id ? 'selected' : ''}`}
                      >
                        <div className="project-header">
                          <div className="project-title-wrapper">
                            <div 
                              className="favorite-star"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFavoriteToggle(project.project_id, project.is_favorite);
                              }}
                            >
                              <StarIcon filled={project.is_favorite} />
                            </div>
                            <div>
                              <h3 className="project-name">{project.project_name}</h3>
                              <p className="project-desc">팀 프로젝트</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="progress-section">
                          <div className="progress-info">
                            <span>진행률</span>
                            <span className="progress-value">{project.progress}%</span>
                          </div>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{ width: `${project.progress}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        {/* 선택된 프로젝트의 상세 정보 */}
                        {selectedProjectId === project.project_id && (
                          <div className="project-detail-inline">
                            <div className="detail-item">
                              <span>진행중인 업무</span>
                              <span className="detail-value">8개</span>
                            </div>
                            <div className="detail-item">
                              <span>남은 기간</span>
                              <span className="detail-value red-text">23일</span>
                            </div>
                            <button 
                              className="detail-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                // 프로젝트 상세 페이지로 이동
                                fetch("http://127.0.0.1:8000/api/users/projects/set/", {
                                  method: "POST",
                                  credentials: "include",
                                  headers: {
                                    "Content-Type": "application/x-www-form-urlencoded",
                                  },
                                  body: new URLSearchParams({
                                    project_id: project.project_id,
                                  }),
                                })
                                  .then((res) => res.json())
                                  .then((data) => {
                                    console.log(data.message);
                                    window.location.href = `/project/${project.project_id}/task`;
                                  })
                                  .catch((err) => console.error("Error setting project ID:", err));
                              }}
                            >
                              프로젝트 상세 보기 <ChevronRightIcon />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="loading-container">
                    <p>Loading...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Center - Calendar */}
            <div className="center-section">
              <div className="section-card calendar-section">
                <h2 className="section-title">캘린더</h2>
                
                <div className="calendar-wrapper">
                  <Calendar
                    onChange={setDate}
                    value={date}
                    onClickDay={(value) => {
                      const formatted = formatDate(value);
                      setSelectedDate(formatted);
                    }}
                    locale="ko-KR"
                    calendarType="gregory"
                    onActiveStartDateChange={({ activeStartDate }) => setActiveStartDate(activeStartDate)}
                    tileClassName={({ date }) => {
                      if (date.getMonth() !== activeStartDate.getMonth()) {
                        return "neighboring-month";
                      }
                      const day = date.getDay();
                      if (day === 0) return "sunday";
                      if (day === 6) return "saturday";
                      return "";
                    }}
                    tileContent={({ date }) => {
                      const formatted = formatDate(date);
                      const personalEvents = mySchedules.filter(schedule => schedule.start_time === formatted);
                      const teamEvents = teamSchedules.filter(schedule => formatDate(schedule.end_date_due_date) === formatted);
                      
                      if (personalEvents.length > 0 || teamEvents.length > 0) {
                        return (
                          <div className="event-markers">
                            {personalEvents.length > 0 && <span className="event-dot personal"></span>}
                            {teamEvents.length > 0 && <span className="event-dot team"></span>}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </div>

                {/* 오늘 일정과 선택한 날짜 일정 */}
                <div className="schedule-summary">
                  <div className="schedule-day">
                    <h4 className="schedule-day-title">오늘 일정</h4>
                    <div className="schedule-items">
                      {todaySchedules.length === 0 && todayTeamSchedules.length === 0 ? (
                        <p className="no-schedule">일정이 없습니다</p>
                      ) : (
                        <>
                          {todaySchedules.map(schedule => (
                            <div key={schedule.schedule_id} className="schedule-item">
                              <span className="schedule-dot personal"></span>
                              <span className="schedule-text">{schedule.title}</span>
                            </div>
                          ))}
                          {todayTeamSchedules.map(schedule => (
                            <div key={schedule.task_id} className="schedule-item">
                              <span className="schedule-dot team"></span>
                              <span className="schedule-text">{schedule.task_name}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="schedule-day">
                    <h4 className="schedule-day-title">
                      {selectedDate ? `${selectedDate} 일정` : '날짜를 선택하세요'}
                    </h4>
                    <div className="schedule-items">
                      {selectedDate ? (
                        selectedDateSchedules.length === 0 && selectedDateTeamSchedules.length === 0 ? (
                          <p className="no-schedule">일정이 없습니다</p>
                        ) : (
                          <>
                            {selectedDateSchedules.map(schedule => (
                              <div key={schedule.schedule_id} className="schedule-item">
                                <span className="schedule-dot personal"></span>
                                <span className="schedule-text">{schedule.title}</span>
                              </div>
                            ))}
                            {selectedDateTeamSchedules.map(schedule => (
                              <div key={schedule.task_id} className="schedule-item">
                                <span className="schedule-dot team"></span>
                                <span className="schedule-text">{schedule.task_name}</span>
                              </div>
                            ))}
                          </>
                        )
                      ) : (
                        <p className="no-schedule">캘린더에서 날짜를 클릭하세요</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - Recent Activity */}
            <div className="right-section">
              <div className="section-card activity-section">
                <h2 className="section-title">최근 활동</h2>
                <div className="activity-list">
                  {projectLogs.length === 0 ? (
                    <p className="no-activity">활동 내역이 없습니다</p>
                  ) : (
                    projectLogs.slice(0, 10).map((log, idx) => {
                      const userName = log.user_name || log.user || "알 수 없음";
                      const createdAt = log.created_date || log.date;
                      const taskObj = log.task_name || log.task || null;
                      const snap = parseSnapshot(log.content || "");
                      const taskName = taskObj || snap.name;
                      const bodyText = snap.verb || log.content.replace(/^\[task_id=\d+\]\s*/u, "");

                      return (
                        <div className="activity-log-item" key={idx}>
                          <div className="activity-log-header">
                            <div className="activity-user-info">
                              <span className="activity-user-name">{userName}</span>
                              <span className={`activity-action-label ${labelClass(log.action)}`}>
                                {log.action}
                              </span>
                            </div>
                            <span className="activity-time">
                              {createdAt && new Date(createdAt).toLocaleString('ko-KR', { 
                                month: 'numeric', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                          <p className="activity-task-name">업무: {taskName}</p>
                          {bodyText && <p className="activity-content">{bodyText}</p>}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            {/* // return문의 맨 마지막 </div> 직전에 추가 */}
                {showModal && (
                  <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                      <div className="modal-header">
                        <h2 className="modal-title">{modalData.title}</h2>
                        <button className="modal-close" onClick={closeModal}>×</button>
                      </div>
                      <div className="modal-body">
                        {modalData.tasks.length === 0 ? (
                          <p className="no-tasks">업무가 없습니다.</p>
                        ) : (
                          <div className="task-list">
                            {modalData.tasks.map((task) => (
                              <div key={task.task_id} className="task-item">
                                <div className="task-info">
                                  <h4 className="task-name">{task.task_name}</h4>
                                  <p className="project-info">
                                    📁 {task.project_name}
                                  </p>
                                  <div className="task-meta">
                                    <span className={`status-badge status-${task.status_code}`}>
                                      {task.status}
                                    </span>
                                    <span className="due-date">
                                      {formatModalDate(task.end_date)}
                                      {modalData.type === 'urgent' && task.end_date && (
                                        <span className="d-day"> ({calculateDDay(task.end_date)})</span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="modal-footer">
                        <p className="task-count">총 {modalData.total}개의 업무</p>
                      </div>
                    </div>
                  </div>
                )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainPage;