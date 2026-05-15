# -*- coding: utf-8 -*-
"""
화면설계서(코어기능) 전체 생성 실행 스크립트
실행: python run_core_screen_all.py
"""
import subprocess, sys, os

base = r'C:\gerardo\01 SmallSF\Imjingang-Kimchi\산출물\설계단계'
parts = [
    'gen_core_screen_p1.py',
    'gen_core_screen_p2.py',
    'gen_core_screen_p3.py',
    'gen_core_screen_p4.py',
]

for part in parts:
    script = os.path.join(base, part)
    print(f'\n{"="*60}')
    print(f'실행 중: {part}')
    print('='*60)
    result = subprocess.run([sys.executable, script], capture_output=True, text=True, encoding='utf-8')
    if result.stdout:
        print(result.stdout)
    if result.returncode != 0:
        print(f'[오류] {part} 실행 실패!')
        print(result.stderr)
        sys.exit(1)
    else:
        print(f'[완료] {part}')

print('\n' + '='*60)
print('화면설계서(코어기능) 생성 완료!')
print(r'파일 위치: C:\gerardo\01 SmallSF\Imjingang-Kimchi\산출물\설계단계\06_화면설계서_코어기능.docx')
print('='*60)
