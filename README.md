# As of 2023, [LightChat](https://lightchat.walker30263.repl.co/) has been officially sunsetted by the original developers. It will still be available through [repl.it](https://lightchat.walker30263.repl.co/), but no longer on lightchat.ml

### This was one of our first projects that was actually used by people on the Internet whom we didn't know personally (mainly middle schoolers who wanted to text their friends during class on their Chromebooks 💀💀), and it made us get into web development as a hobby. Thank you to everyone who supported lightchat.ml in the past by using it, or by contributing suggestions or code. We will still keep this GitHub repository public for the memories.

# All of the code here still works, so feel free to host it on your own and continue LightChat's legacy! (You might need to edit instances of "lightchat.ml" in the code with your own custom domain.)

## New: XSS/Arbitary Code Execution prevention
### Before this update, people could use HTML in their messages. This led to people being able to use the script tag and the style tag to change stuff like background color of LightChat on all clients connected to a room. 
### We restructured the way we handle messages, and as a result, all HTML in messages is treated as plain text, making this "hack" impossible.

## Lightweight real-time chat app made with node.js and socket.io
### Public and Private chat rooms that you can make and join
### Invite links!
#### In the format https://lightchat.ml/invite/{invite-code}
### Simple UI
![](https://github.com/Walker30263/lightchat/blob/main/assets/ui-screenshots/ui_v1-1.png?raw=true)
![](https://github.com/Walker30263/lightchat/blob/main/assets/ui-screenshots/chat-ui_v1-1.png?raw=true)
![](https://github.com/Walker30263/lightchat/blob/main/assets/ui-screenshots/gettingInvited-ui_v1-1.png?raw=true)
### In-chat Commands to customize your experience:
<table>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Example</th>
          </tr>
          <tr>
            <td>!help</td>
            <td>View Commands</td>
            <td>!help</td>
          </tr>
          <tr>
            <td>!setUsername</td>
            <td>Sets Username</td>
            <td>!setUsername username</td>
          </tr>
          <tr>
            <td>!invite</td>
            <td>Gives you an invite link to the current chat room</td>
            <td>!invite</td>
          </tr>
          <tr>
            <td>!users</td>
            <td>User Count</td>
            <td>!users</td>
          </tr>
          <tr>
            <td>!color</td>
            <td>Color your message</td>
            <td>!color #00ff00 This message is green!</td>
          </tr>
          <tr>
            <td>!setColor</td>
            <td>Sets Username Color</td>
            <td>!setColor crimson</td>
          </tr>
        </table>

## Contributors
### [@walker30263](https://github.com/walker30263)
### [@python9160](https://github.com/python9160)
### [@dummiedum](https://github.com/dummiedum)
