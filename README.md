# Zabbix Api Setup:

![2025-05-08 23_39_58-Zabbix docker_ Configuration of user groups and 1 more page - Personal - Microso](https://github.com/user-attachments/assets/76ec0c26-fb2f-44da-ba4b-f391565113bd)

![2025-05-08 23_41_43-Zabbix docker_ Configuration of user groups and 3 more pages - Personal - Micros](https://github.com/user-attachments/assets/5b9e21c0-7864-40fa-88b1-bf684045606f)

![2025-05-08 23_42_14-Zabbix docker_ Configuration of users and 3 more pages - Personal - Microsoft​ E](https://github.com/user-attachments/assets/0c530c96-1f2e-460c-8836-345a1a5381a0)

# Zabbix Api Authentication methods:

## NEW zabbix
```
curl --request POST \
  --url 'ZABBIX_URL' \
  --header 'Content-Type: application/json-rpc' \
  --header 'Authorization: Bearer ZABBIX_TOKEN' \
  --data '{
    "jsonrpc": "2.0",
    "method": "problem.get",
    "params": {
      "severities": [4, 5],
      "sortfield": "eventid",
      "sortorder": "DESC"
    },
    "id": 1
 }'
```

## OLD Zabbix
``` 
curl -H "Content-Type: application/json-rpc" -X POST ZABBIX_URL -d '{
    "jsonrpc": "2.0",
    "method": "problem.get",
    "params": {
      "severities": [4, 5],
      "sortfield": "eventid",
      "sortorder": "DESC"
    },
    "auth": "ZABBIX_TOKEN",
    "id": 1
 }'
```
