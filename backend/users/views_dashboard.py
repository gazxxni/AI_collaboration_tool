# backend/users/views_dashboard.py
from datetime import date, timedelta
from calendar import monthrange

from django.db.models import Count, Exists, OuterRef, Q
from rest_framework.views import APIView
from rest_framework.response import Response

# ⬇️ 모델 import 경로: 네가 모델을 db_model에 두었으므로 이렇게
from db_model.models import (
    User, Project, ProjectMember, FavoriteProject,
    Task, TaskManager, Schedule, Log
)

DONE_STATUSES   = {'DONE', '완료'}
ACTIVE_STATUSES = {'TODO', 'DOING', 'IN_PROGRESS', '진행중', '대기'}
URGENT_DAYS     = 3


def month_bounds(yyyy_mm: str | None):
    today = date.today()
    if not yyyy_mm:
        y, m = today.year, today.month
    else:
        y, m = map(int, yyyy_mm.split('-'))
    last = monthrange(y, m)[1]
    return date(y, m, 1), date(y, m, last)

class DashboardView(APIView):

    def get(self, request, user_id: int):
        
        session_uid = request.session.get("user_id")
        if not session_uid:
            return Response({"detail": "로그인이 필요합니다."}, status=401)

        # 문자열/정수 혼합 대비해서 int 비교 권장
        if int(session_uid) != int(user_id):
            return Response({"detail": "권한이 없습니다."}, status=403)

        month = request.query_params.get('month')
        start_d, end_d = month_bounds(month)

        user = User.objects.filter(user_id=user_id).values('user_id', 'name').first()
        if not user:
            return Response({"detail": "User not found"}, status=404)

        # 내가 속한 프로젝트
        project_ids_qs = ProjectMember.objects.filter(user_id=user_id).values_list('project_id', flat=True)

        # 프로젝트 + 즐겨찾기 여부
        fav_exists = FavoriteProject.objects.filter(user_id=user_id, project_id=OuterRef('project_id'))
        projects_qs = (Project.objects
            .filter(project_id__in=project_ids_qs)
            .annotate(is_fav=Exists(fav_exists))
            .values('project_id', 'project_name', 'is_fav'))

        # 진행률 집계
        total_by_project = dict(
            TaskManager.objects.filter(project_id__in=project_ids_qs)
            .values('project_id').annotate(cnt=Count('task', distinct=True))
            .values_list('project_id', 'cnt')
        )
        done_task_ids = Task.objects.filter(status__in=DONE_STATUSES).values_list('task_id', flat=True)
        done_by_project = dict(
            TaskManager.objects.filter(project_id__in=project_ids_qs, task_id__in=done_task_ids)
            .values('project_id').annotate(cnt=Count('task', distinct=True))
            .values_list('project_id', 'cnt')
        )

        projects_payload = []
        for p in projects_qs:
            pid   = p['project_id']
            total = total_by_project.get(pid, 0)
            done  = done_by_project.get(pid, 0)
            progress = int((done * 100) / total) if total else 0
            projects_payload.append({
                "project_id":   pid,
                "project_name": p['project_name'],
                "is_favorite":  bool(p['is_fav']),
                "progress":     progress,
            })

        # 내 업무 통계
        my_task_ids = set(
            TaskManager.objects.filter(user_id=user_id).values_list('task_id', flat=True)
        )
        my_tasks_count = Task.objects.filter(task_id__in=my_task_ids, status__in=ACTIVE_STATUSES).count()
        completed_count = Task.objects.filter(task_id__in=my_task_ids, status__in=DONE_STATUSES).count()
        today = date.today()
        urgent_end = today + timedelta(days=URGENT_DAYS)
        urgent_count = Task.objects.filter(
            task_id__in=my_task_ids,
            status__in=ACTIVE_STATUSES,
            end_date__date__range=(today, urgent_end)
        ).count()

        task_stats = {
            "my_tasks":        my_tasks_count,
            "completed_tasks": completed_count,
            "urgent_tasks":    urgent_count
        }

        # 최근 로그 20개
        recent_logs_qs = Log.objects.select_related('user', 'task').order_by('-created_date')[:20]
        recent_logs = [{
            "user_name":    (log.user.name if log.user else "알 수 없음"),
            "action":       log.action,
            "created_date": log.created_date,
            "task_name":    (log.task.task_name if log.task else None),
            "content":      (log.content or "")
        } for log in recent_logs_qs]

        # 캘린더(이 달)
        my_calendar_qs = (Schedule.objects
            .filter(user_id=user_id, start_time__range=(start_d, end_d))
            .values('schedule_id', 'start_time', 'title'))
        my_calendar = [{"date": r['start_time'], "schedule_id": r['schedule_id'], "title": r['title']}
                       for r in my_calendar_qs]

        team_task_ids = TaskManager.objects.filter(project_id__in=project_ids_qs).values_list('task_id', flat=True)
        team_calendar_qs = (Task.objects
            .filter(task_id__in=team_task_ids, end_date__date__range=(start_d, end_d))
            .values('task_id', 'task_name', 'end_date'))
        team_calendar = [{"date": r['end_date'], "task_id": r['task_id'], "task_name": r['task_name']}
                         for r in team_calendar_qs]

        return Response({
            "user": {"user_id": user['user_id'], "name": user['name']},
            "projects": projects_payload,
            "task_stats": task_stats,
            "recent_logs": recent_logs,
            "calendar": {"my": my_calendar, "team": team_calendar}
        })


class TaskDetailsView(APIView):


    def get(self, request):
        session_uid = request.session.get("user_id")
        if not session_uid:
            return Response({"detail": "로그인이 필요합니다."}, status=401)

        t = request.query_params.get('type')   # 'my' | 'completed' | 'urgent'
        if t not in ('my', 'completed', 'urgent'):
            return Response({"detail": "Invalid type"}, status=400)
        
        my_task_ids = TaskManager.objects.filter(user_id=session_uid).values_list('task_id', flat=True)
        qs = Task.objects.filter(task_id__in=my_task_ids)

        if t == 'my':
            qs = qs.filter(status__in=ACTIVE_STATUSES)
        elif t == 'completed':
            qs = qs.filter(status__in=DONE_STATUSES)
        else:  # urgent
            today = date.today()
            urgent_end = today + timedelta(days=URGENT_DAYS)
            qs = qs.filter(status__in=ACTIVE_STATUSES, end_date__date__range=(today, urgent_end))

        # Task → Project 이름 맵핑
        task_ids = list(qs.values_list('task_id', flat=True))
        tm = list(TaskManager.objects.filter(task_id__in=task_ids).values('task_id', 'project_id'))
        pids = {row['project_id'] for row in tm}
        projects = dict(Project.objects.filter(project_id__in=pids).values_list('project_id', 'project_name'))
        task_to_project = {}
        for row in tm:
            task_to_project.setdefault(row['task_id'], row['project_id'])

        tasks = []
        for trow in qs.order_by('end_date', 'task_id').values('task_id', 'task_name', 'status', 'end_date'):
            pid = task_to_project.get(trow['task_id'])
            tasks.append({
                "task_id": trow['task_id'],
                "task_name": trow['task_name'],
                "status": trow['status'],
                "status_code": trow['status'],
                "end_date": trow['end_date'],
                "project_name": projects.get(pid),
            })
        return Response({"total": len(tasks), "tasks": tasks})
