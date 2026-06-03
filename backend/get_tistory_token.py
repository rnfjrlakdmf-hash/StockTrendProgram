import urllib.request
import webbrowser

print("="*50)
print("티스토리 Access Token 발급 도우미")
print("="*50)

app_id = input("1. 발급받은 App ID (Client ID)를 입력하세요: ").strip()
secret_key = input("2. 발급받은 Secret Key를 입력하세요: ").strip()
redirect_uri = "https://stock-trend-program.co.kr"

print("\n[1단계] 브라우저가 열리면 티스토리 로그인을 하시고 '허가하기'를 눌러주세요.")
print("허가 후 사이트(stock-trend-program.co.kr)로 이동하게 됩니다.")
print("이때 브라우저 주소창을 보시면 ?code= 뒤에 아주 긴 영어/숫자가 있습니다.")

auth_url = f"https://www.tistory.com/oauth/authorize?client_id={app_id}&redirect_uri={redirect_uri}&response_type=code"
webbrowser.open(auth_url)

auth_code = input("\n3. 브라우저 주소창의 code= 뒤에 있는 값을 복사해서 여기에 붙여넣어주세요: ").strip()

print("\n[2단계] Access Token 발급 중...")

token_url = f"https://www.tistory.com/oauth/access_token?client_id={app_id}&client_secret={secret_key}&redirect_uri={redirect_uri}&code={auth_code}&grant_type=authorization_code"

try:
    req = urllib.request.Request(token_url)
    response = urllib.request.urlopen(req)
    res_body = response.read().decode('utf-8')
    
    # 응답이 access_token=어쩌고 저쩌고 형태로 옴
    if "access_token=" in res_body:
        access_token = res_body.split("access_token=")[1]
        print("\n🎉 발급 성공! 🎉")
        print("아래의 Access Token을 복사해서 .env 파일의 TISTORY_ACCESS_TOKEN 값으로 넣어주세요.")
        print("-" * 50)
        print(access_token)
        print("-" * 50)
    else:
        print("\n발급 실패. 응답:", res_body)

except Exception as e:
    print("\n에러가 발생했습니다. code 값이나 App ID, Secret Key가 정확한지 확인해주세요.")
    print(e)
