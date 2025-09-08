from django.http import JsonResponse
from django.db import connection
from django.utils.timezone import localtime,make_aware  # ✅ localtime 추가 시간 변환
import datetime
from django.views.decorators.csrf import csrf_exempt
import json

def get_user_projects(request, user_id):
    print(f"📡 API 요청됨: user_id={user_id}")

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT p.project_id, p.project_name, COALESCE(
                (SELECT m.created_date FROM Message m 
                 WHERE m.project_id = p.project_id 
                 ORDER BY m.created_date DESC 
                 LIMIT 1), NULL) AS latest_message_time
            FROM ProjectMember pm
            JOIN Project p ON pm.project_id = p.project_id
            WHERE pm.user_id = %s AND p.project_name IS NOT NULL
        """, [user_id])
        
        projects = []
        for row in cursor.fetchall():
            project_id, project_name, latest_message_time = row

            # ✅ 최신 메시지가 없을 경우 처리
            if latest_message_time:
                if isinstance(latest_message_time, datetime.datetime) and latest_message_time.tzinfo is None:
                    latest_message_time = make_aware(latest_message_time)
                latest_message_time = localtime(latest_message_time).strftime('%Y-%m-%d %H:%M:%S')

            projects.append({
                "project_id": project_id,
                "project_name": project_name,
                "latest_message_time": latest_message_time
            })

    print(f"📡 조회된 프로젝트 목록 (최신 메시지 포함): {projects}")

    if not projects:
        return JsonResponse({"error": "해당 사용자가 속한 프로젝트가 없습니다."}, status=404)

    return JsonResponse({"projects": projects}, json_dumps_params={'ensure_ascii': False})

# ✅ 프로젝트 ID로 메시지 목록 조회
def get_project_messages(request, project_id):
    print(f"📡 API 요청됨: project_id={project_id}의 메시지 불러오기")

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT m.message_id, m.content, m.created_date, u.name,m.user_id
            FROM Message m
            JOIN User u ON m.user_id = u.user_id
            WHERE m.project_id = %s
            ORDER BY m.created_date ASC
        """, [project_id])

        messages = []
        for row in cursor.fetchall():
            message_id, message, created_date, username,user_id = row

            # ✅ 시간 변환 (timezone-aware)
            if isinstance(created_date, datetime.datetime) and created_date.tzinfo is None:
                created_date = make_aware(created_date)

            # ✅ 날짜 포맷 변경 (2/15 02:56)
            formatted_time = localtime(created_date).strftime('%#m/%#d %H:%M')  # Windows (주석 해제 후 사용)

            messages.append({
                "message_id": message_id,
                "message": message,
                "timestamp": formatted_time,
                "username": username,
                "user_id":user_id
                
            })

    print(f"📡 조회된 메시지 목록: {messages}")
    return JsonResponse({"messages": messages}, json_dumps_params={'ensure_ascii': False})

def get_project_name(request, project_id):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT project_name FROM Project WHERE project_id = %s
        """, [project_id])
        result = cursor.fetchone()

    if result:
        return JsonResponse({"project_name": result[0]}, json_dumps_params={'ensure_ascii': False})
    else:
        return JsonResponse({"error": "프로젝트를 찾을 수 없습니다."}, status=404)


#===========================================
#DM

# ─── 1:1 DM 방 목록 조회 ────────────────────────────────
def get_dm_rooms(request, user_id):
    """
    GET /chat/api/user/{user_id}/dm_rooms/
    이 사용자가 속한 DM 방 목록(상대방 ID/이름, 최근 메시지 시간)을 반환
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
              dr.room_id,
              CASE
                WHEN dr.user1_id = %s THEN dr.user2_id
                ELSE dr.user1_id
              END AS partner_id,
              u.name AS partner_name,
              -- 마지막 DM 메시지 시간
              (SELECT dm.created_date
                 FROM DirectMessage dm
                WHERE dm.room_id = dr.room_id
                ORDER BY dm.created_date DESC
                LIMIT 1
              ) AS latest_message_time
            FROM DirectMessageRoom dr
            JOIN `User` u
              ON u.user_id = CASE
                               WHEN dr.user1_id = %s THEN dr.user2_id
                               ELSE dr.user1_id
                             END
           WHERE dr.user1_id = %s OR dr.user2_id = %s
        """, [user_id, user_id, user_id, user_id])

        rooms = []
        for row in cursor.fetchall():
            room_id, partner_id, partner_name, lmt = row

            if lmt and isinstance(lmt, datetime.datetime) and lmt.tzinfo is None:
                lmt = make_aware(lmt)
            latest = localtime(lmt).strftime('%Y-%m-%d %H:%M:%S') if lmt else None

            rooms.append({
                "room_id": room_id,
                "partner_id": partner_id,
                "partner_name": partner_name,
                "latest_message_time": latest,
            })

    return JsonResponse({"dm_rooms": rooms}, json_dumps_params={'ensure_ascii': False})


# ─── 1:1 DM 방 생성/조회 ────────────────────────────────
@csrf_exempt
def create_dm_room(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST만 허용됩니다."}, status=405)

    data = json.loads(request.body)
    # 문자열로 들어온 값을 int로 파싱
    try:
        me   = int(data.get("user_id"))
        them = int(data.get("target_id"))
    except (TypeError, ValueError):
        return JsonResponse(
            {"error": "user_id와 target_id는 정수여야 합니다."},
            status=400
        )

    if me == them:
        return JsonResponse(
            {"error": "본인과의 DM은 생성할 수 없습니다."},
            status=400
        )

    # 작은 ID를 user1, 큰 ID를 user2로 고정
    a, b = sorted([me, them])

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT room_id
              FROM DirectMessageRoom
             WHERE user1_id = %s AND user2_id = %s
        """, [a, b])
        row = cursor.fetchone()

        if row:
            room_id = row[0]
        else:
            cursor.execute("""
                INSERT INTO DirectMessageRoom (user1_id, user2_id)
                VALUES (%s, %s)
            """, [a, b])
            room_id = cursor.lastrowid

    return JsonResponse({"room_id": room_id}, status=201)



# ─── 1:1 DM 메시지 목록 조회 ────────────────────────────
# def get_dm_messages(request, room_id):
#     """
#     GET /chat/api/dm_rooms/{room_id}/messages/
#     해당 DM 방의 메시지 리스트를 반환
#     """
#     with connection.cursor() as cursor:
#         cursor.execute("""
#             SELECT
#               dm.message_id,
#               dm.content,
#               dm.created_date,
#               u.name,
#               dm.user_id
#             FROM DirectMessage dm
#             JOIN `User` u ON dm.user_id = u.user_id
#            WHERE dm.room_id = %s
#            ORDER BY dm.created_date ASC
#         """, [room_id])

#         msgs = []
#         for row in cursor.fetchall():
#             msg_id, content, cd, username, uid = row
#             if isinstance(cd, datetime.datetime) and cd.tzinfo is None:
#                 cd = make_aware(cd)
#             ts = localtime(cd).strftime('%Y-%m-%d %H:%M:%S')
#             msgs.append({
#                 "message_id": msg_id,
#                 "message": content,
#                 "timestamp": ts,
#                 "username": username,
#                 "user_id": uid,
#             })

#     return JsonResponse({"messages": msgs}, json_dumps_params={'ensure_ascii': False})

from django.utils.timezone import localtime

def get_dm_messages(request, room_id):
    """
    GET /chat/api/dm_rooms/{room_id}/messages/
    해당 DM 방의 메시지 리스트를 반환
    """
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
              dm.message_id,
              dm.content,
              dm.created_date,
              u.name,
              dm.user_id
            FROM DirectMessage dm
            JOIN `User` u ON dm.user_id = u.user_id
           WHERE dm.room_id = %s
           ORDER BY dm.created_date ASC
        """, [room_id])

        msgs = []
        for row in cursor.fetchall():
            msg_id, content, cd, username, uid = row

            # timezone-aware 처리
            if isinstance(cd, datetime.datetime) and cd.tzinfo is None:
                cd = make_aware(cd)

            # 1) 원래 ISO 타임스탬프 (필요하다면 남겨두세요)
            # ts = localtime(cd).strftime('%Y-%m-%d %H:%M:%S')

            # 2) 원하는 "M/D H:mm" 포맷
            formatted_time = localtime(cd).strftime('%#m/%#d %H:%M')

            msgs.append({
                "message_id": msg_id,
                "message": content,
                "timestamp": formatted_time,      # 여기에 포맷된 문자열을 넣습니다
                "username": username,
                "user_id": uid,
            })

    return JsonResponse({"messages": msgs}, json_dumps_params={'ensure_ascii': False})
